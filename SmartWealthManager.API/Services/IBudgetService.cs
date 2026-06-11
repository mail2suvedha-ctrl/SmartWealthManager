using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmartWealthManager.API.Dtos;

namespace SmartWealthManager.API.Services
{
    public interface IBudgetService
    {
          Task<IEnumerable<BudgetStatusDto>> GetUserBudgetsWithProgressAsync(int userId, int month, int year);
    Task<BudgetStatusDto?> SetBudgetAsync(CreateBudgetDto dto, int userId);
    Task<bool> DeleteBudgetAsync(int id, int userId);
        
    }
}