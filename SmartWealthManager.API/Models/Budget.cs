using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartWealthManager.API.Models
{
    public class Budget
    {
        
         [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    public int CategoryId { get; set; }
    
    [ForeignKey(nameof(CategoryId))]
    public Category? Category { get; set; }

    [Required]
    [Column(TypeName = "decimal(18, 2)")]
    public decimal BudgetAmount { get; set; }

    [Required]
    [Range(1, 12)]
    public int Month { get; set; }

    [Required]
    public int Year { get; set; }
    }
}