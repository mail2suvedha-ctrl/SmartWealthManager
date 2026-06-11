using Microsoft.EntityFrameworkCore;
using SmartWealthManager.API.Data;
using SmartWealthManager.API.Dtos;
using SmartWealthManager.API.Models;

namespace SmartWealthManager.API.Services;

public class BudgetService : IBudgetService
{
    private readonly ApplicationDbContext _context;

    public BudgetService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets all budgets set by a user for a specific month and year,
    /// and dynamically calculates their spending progress from the Transactions table.
    /// </summary>
    public async Task<IEnumerable<BudgetStatusDto>> GetUserBudgetsWithProgressAsync(int userId, int month, int year)
    {
        // 1. Fetch all budgets set by the user for this period
        var budgets = await _context.Budgets
            .Include(b => b.Category)
            .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
            .ToListAsync();

        // 2. Fetch all expenses logged by the user for this specific month and year
        // We calculate start and end dates to filter correctly
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var monthlyExpenses = await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == userId && 
                        t.TransactionDate >= startDate && 
                        t.TransactionDate <= endDate &&
                        t.Category != null && t.Category.Type == "Expense")
            .ToListAsync();

        var budgetStatuses = new List<BudgetStatusDto>();

        foreach (var budget in budgets)
        {
            // Calculate total spending in this budget's category
            var spendingForCategory = monthlyExpenses
                .Where(e => e.CategoryId == budget.CategoryId)
                .Sum(e => e.Amount);

            var remaining = budget.BudgetAmount - spendingForCategory;
            
            // Calculate usage percentage safely (handle division by zero if budget is 0)
            double usagePercent = budget.BudgetAmount > 0 
                ? (double)Math.Round((spendingForCategory / budget.BudgetAmount) * 100, 2) 
                : 0;

            budgetStatuses.Add(new BudgetStatusDto
            {
                Id = budget.Id,
                CategoryId = budget.CategoryId,
                CategoryName = budget.Category?.Name ?? "Others",
                CategoryIcon = budget.Category?.Icon ?? "💰",
                BudgetAmount = budget.BudgetAmount,
                CurrentSpending = spendingForCategory,
                RemainingAmount = remaining,
                UsagePercentage = usagePercent,
                Month = budget.Month,
                Year = budget.Year,
                // Warning triggers when budget usage hits or exceeds 90% (as requested in specifications!)
                IsLimitWarningTriggered = usagePercent >= 90.0
            });
        }

        return budgetStatuses;
    }

    /// <summary>
    /// Adds a new budget. If a budget already exists for this category/month/year combination,
    /// it updates the existing limit instead of failing (Upsert pattern).
    /// </summary>
    public async Task<BudgetStatusDto?> SetBudgetAsync(CreateBudgetDto dto, int userId)
    {
        // Check if category exists and is an expense category
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId);
        if (category == null || category.Type != "Expense")
            return null; // Budgets can only be set for Expense categories!

        // Lookup existing budget to prevent duplicate indexes
        var existingBudget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.UserId == userId && 
                                      b.CategoryId == dto.CategoryId && 
                                      b.Month == dto.Month && 
                                      b.Year == dto.Year);

        if (existingBudget != null)
        {
            // Update the existing limit (Upsert logic)
            existingBudget.BudgetAmount = dto.BudgetAmount;
        }
        else
        {
            // Create a brand new budget limit
            var newBudget = new Budget
            {
                UserId = userId,
                CategoryId = dto.CategoryId,
                BudgetAmount = dto.BudgetAmount,
                Month = dto.Month,
                Year = dto.Year
            };
            _context.Budgets.Add(newBudget);
        }

        await _context.SaveChangesAsync();

        // Calculate and return progress for this updated budget
        var statuses = await GetUserBudgetsWithProgressAsync(userId, dto.Month, dto.Year);
        return statuses.FirstOrDefault(s => s.CategoryId == dto.CategoryId);
    }

    public async Task<bool> DeleteBudgetAsync(int id, int userId)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (budget == null)
            return false;

        _context.Budgets.Remove(budget);
        await _context.SaveChangesAsync();
        return true;
    }
}