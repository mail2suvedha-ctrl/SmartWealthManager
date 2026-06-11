using System.ComponentModel.DataAnnotations;

namespace SmartWealthManager.API.Dtos;

/// <summary>
/// Combined DTO containing the complete high-level summary for the user's dashboard homepage.
/// </summary>
public class DashboardSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal NetSavings { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    
    // Total budget categories that have crossed 90% utilization
    public int ActiveBudgetWarningsCount { get; set; }

    // List of expenses grouped by category for rendering Donut/Pie charts
    public List<CategoryDistributionDto> CategoryDistribution { get; set; } = new();
}

