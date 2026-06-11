using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using SmartWealthManager.API.Dtos;

namespace SmartWealthManager.API.Services;

public interface ITransactionService
{
    Task<IEnumerable<TransactionResponseDto>> GetUserTransactionsAsync(int userId);
    Task<TransactionResponseDto?> GetTransactionByIdAsync(int id, int userId);
    Task<TransactionResponseDto?> CreateTransactionAsync(CreateTransactionDto dto, int userId);
    Task<bool> DeleteTransactionAsync(int id, int userId);
}