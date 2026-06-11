using Microsoft.EntityFrameworkCore;
using SmartWealthManager.API.Data;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Models;

namespace SmartWealthManager.API.Services;

public class TransactionService : ITransactionService
{
    private readonly ApplicationDbContext _context;

    public TransactionService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets all transactions logged by the current authorized user.
    /// Uses .Include() to perform a SQL JOIN to pull category assets (Name, Type, Icon).
    /// </summary>
    public async Task<IEnumerable<TransactionResponseDto>> GetUserTransactionsAsync(int userId)
    {
        return await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.TransactionDate)
            .Select(t => new TransactionResponseDto
            {
                Id = t.Id,
                ClientGeneratedId = t.ClientGeneratedId,
                CategoryId = t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : "Others",
                CategoryType = t.Category != null ? t.Category.Type : "Expense",
                CategoryIcon = t.Category != null ? t.Category.Icon : "💰",
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                Notes = t.Notes,
                IsSynced = t.IsSynced,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<TransactionResponseDto?> GetTransactionByIdAsync(int id, int userId)
    {
        var t = await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (t == null) return null;

        return new TransactionResponseDto
        {
            Id = t.Id,
            ClientGeneratedId = t.ClientGeneratedId,
            CategoryId = t.CategoryId,
            CategoryName = t.Category != null ? t.Category.Name : "Others",
            CategoryType = t.Category != null ? t.Category.Type : "Expense",
            CategoryIcon = t.Category != null ? t.Category.Icon : "💰",
            Amount = t.Amount,
            TransactionDate = t.TransactionDate,
            Notes = t.Notes,
            IsSynced = t.IsSynced,
            CreatedAt = t.CreatedAt
        };
    }

    /// <summary>
    /// Handles transaction creations with Idempotency protection.
    /// </summary>
    public async Task<TransactionResponseDto?> CreateTransactionAsync(CreateTransactionDto dto, int userId)
    {
        // 1. IDEMPOTENCY CHECK (CRITICAL FOR OFFLINE SYNC PWAs):
        // If the background sync retries the upload, look up if this ClientGeneratedId is already in the database.
        var existingTransaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.ClientGeneratedId == dto.ClientGeneratedId);

        if (existingTransaction != null)
        {
            // If it already exists, do not insert duplicate! Simply return the existing record.
            return new TransactionResponseDto
            {
                Id = existingTransaction.Id,
                ClientGeneratedId = existingTransaction.ClientGeneratedId,
                CategoryId = existingTransaction.CategoryId,
                CategoryName = existingTransaction.Category != null ? existingTransaction.Category.Name : "Others",
                CategoryType = existingTransaction.Category != null ? existingTransaction.Category.Type : "Expense",
                CategoryIcon = existingTransaction.Category != null ? existingTransaction.Category.Icon : "💰",
                Amount = existingTransaction.Amount,
                TransactionDate = existingTransaction.TransactionDate,
                Notes = existingTransaction.Notes,
                IsSynced = true, // It is fully synced now
                CreatedAt = existingTransaction.CreatedAt
            };
        }

        // 2. Validate Category
        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
            return null; // Category not found

        // 3. Map DTO to Db Entity
        var transaction = new Transaction
        {
            ClientGeneratedId = dto.ClientGeneratedId,
            UserId = userId,
            CategoryId = dto.CategoryId,
            Amount = dto.Amount,
            TransactionDate = dto.TransactionDate,
            Notes = dto.Notes,
            IsSynced = true, // Marked as true since it has successfully reached our backend database
            CreatedAt = DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // 4. Reload to return with related Category information
        var savedTransaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstAsync(t => t.Id == transaction.Id);

        return new TransactionResponseDto
        {
            Id = savedTransaction.Id,
            ClientGeneratedId = savedTransaction.ClientGeneratedId,
            CategoryId = savedTransaction.CategoryId,
            CategoryName = savedTransaction.Category != null ? savedTransaction.Category.Name : "Others",
            CategoryType = savedTransaction.Category != null ? savedTransaction.Category.Type : "Expense",
            CategoryIcon = savedTransaction.Category != null ? savedTransaction.Category.Icon : "💰",
            Amount = savedTransaction.Amount,
            TransactionDate = savedTransaction.TransactionDate,
            Notes = savedTransaction.Notes,
            IsSynced = savedTransaction.IsSynced,
            CreatedAt = savedTransaction.CreatedAt
        };
    }

    public async Task<bool> DeleteTransactionAsync(int id, int userId)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (transaction == null)
            return false;

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }
}