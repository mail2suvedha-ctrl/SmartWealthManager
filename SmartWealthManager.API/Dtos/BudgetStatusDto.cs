using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmartWealthManager.API.Dtos
{
    public class BudgetStatusDto
    {
        
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = "💰";
    public decimal BudgetAmount { get; set; }
    public decimal CurrentSpending { get; set; }
    public decimal RemainingAmount { get; set; }
    public double UsagePercentage { get; set; } // e.g. 85.5%
    public int Month { get; set; }
    public int Year { get; set; }
    public bool IsLimitWarningTriggered { get; set; }
    }
}