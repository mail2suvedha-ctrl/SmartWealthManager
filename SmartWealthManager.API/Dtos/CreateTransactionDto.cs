using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace SmartWealthManager.API.Dtos
{
    public class CreateTransactionDto
    {
         [Required]
    public Guid ClientGeneratedId { get; set; }

    [Required]
    public int CategoryId { get; set; }

    [Required]
    [Range(0.01, 9999999.99, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [Required]
    public DateTime TransactionDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    // If added offline first, this might be passed as false during bulk syncs
    public bool IsSynced { get; set; } = true;
        
    }
}