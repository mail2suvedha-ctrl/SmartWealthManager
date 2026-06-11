using Microsoft.EntityFrameworkCore;
using SmartWealthManager.API.Data;
using SmartWealthManager.API.Dtos;

namespace SmartWealthManager.API.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;
    private readonly IBudgetService _budgetService;

    public DashboardService(ApplicationDbContext context, IBudgetService budgetService)
    {
        _context = context;
        _budgetService = budgetService;
    }

    /// <summary>
    /// Aggregates database transactions and budget stats for a given month and year.
    /// </summary>
    public async Task<DashboardSummaryDto> GetMonthlySummaryAsync(int userId, int month, int year)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        // 1. Fetch all transactions for this month/year safely
        var transactions = await _context.Transactions
            .Include(t => t.Category)
            .Where(t => t.UserId == userId && 
                        t.TransactionDate >= startDate && 
                        t.TransactionDate <= endDate)
            .ToListAsync();

        // 2. Aggregate Totals
        var totalIncome = transactions
            .Where(t => t.Category != null && t.Category.Type == "Income")
            .Sum(t => t.Amount);

        var totalExpense = transactions
            .Where(t => t.Category != null && t.Category.Type == "Expense")
            .Sum(t => t.Amount);

        var netSavings = totalIncome - totalExpense;

        // 3. Group Expenses by Category for Chart Distribution
        var categoryGroup = transactions
            .Where(t => t.Category != null && t.Category.Type == "Expense")
            .GroupBy(t => new { t.CategoryId, t.Category!.Name, t.Category.Icon })
            .Select(g => new CategoryDistributionDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryIcon = g.Key.Icon,
                TotalAmount = g.Sum(t => t.Amount),
                Percentage = totalExpense > 0 
                    ? Math.Round((double)(g.Sum(t => t.Amount) / totalExpense) * 100, 2) 
                    : 0
            })
            .OrderByDescending(c => c.TotalAmount)
            .ToList();

        // 4. Calculate Exceeded Budgets (utilizing our existing IBudgetService check)
        var budgetProgress = await _budgetService.GetUserBudgetsWithProgressAsync(userId, month, year);
        var activeBudgetWarnings = budgetProgress.Count(b => b.IsLimitWarningTriggered);

        return new DashboardSummaryDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            NetSavings = netSavings,
            Month = month,
            Year = year,
            ActiveBudgetWarningsCount = activeBudgetWarnings,
            CategoryDistribution = categoryGroup
        };
    }
}