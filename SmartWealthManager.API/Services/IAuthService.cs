using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmartWealthManager.API.Dtos;

namespace SmartWealthManager.API.Services
{
    public interface IAuthService
    {
        
    Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
    bool VerifyPasswordHash(string password, string passwordHash);
    string CreateToken(int userId, string email, string fullName);
    }
}