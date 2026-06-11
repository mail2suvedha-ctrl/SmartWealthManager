using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmartWealthManager.API.Dtos;

namespace SmartWealthManager.API.Services
{
   public interface IDashboardService
{
    Task<DashboardSummaryDto> GetMonthlySummaryAsync(int userId, int month, int year);
}
}