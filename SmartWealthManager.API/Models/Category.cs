using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartWealthManager.API.Models
{
    public class Category
    {
        [Key]
        public int Id { get; set; }

        // Nullable means this is a global default category available to everyone
        public int? UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = string.Empty; // "Income" or "Expense"

        [MaxLength(50)]
        public string Icon { get; set; } = "💰";

    }
}