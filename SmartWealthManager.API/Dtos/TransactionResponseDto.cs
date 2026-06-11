using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmartWealthManager.API.Dtos
{
    public class TransactionResponseDto
    {
        
    public int Id { get; set; }
    public Guid ClientGeneratedId { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryType { get; set; } = string.Empty; // "Income" or "Expense"
    public string CategoryIcon { get; set; } = "💰";
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? Notes { get; set; }
    public bool IsSynced { get; set; }
    public DateTime CreatedAt { get; set; }
    }
}