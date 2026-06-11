using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


namespace SmartWealthManager.API.Dtos
{
  public class CategoryDistributionDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = "💰";
    public decimal TotalAmount { get; set; }
    public double Percentage { get; set; } // Percentage of total expenses
}
}
