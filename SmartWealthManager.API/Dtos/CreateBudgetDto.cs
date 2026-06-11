using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace SmartWealthManager.API.Dtos
{
    public class CreateBudgetDto
    {
        
        
    [Required]
    public int CategoryId { get; set; }

    [Required]
    [Range(0.01, 9999999.99, ErrorMessage = "Budget amount must be greater than zero.")]
    public decimal BudgetAmount { get; set; }

    [Required]
    [Range(1, 12, ErrorMessage = "Month must be between 1 and 12.")]
    public int Month { get; set; }

    [Required]
    [Range(2000, 2100, ErrorMessage = "Please enter a valid 4-digit year.")]
    public int Year { get; set; }
    }
}