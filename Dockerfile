FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Change this line - add folder path
COPY SmartWealthManager.API/SmartWealthManager.API.csproj SmartWealthManager.API/
RUN dotnet restore SmartWealthManager.API/SmartWealthManager.API.csproj

# Change this line
COPY SmartWealthManager.API/. SmartWealthManager.API/
WORKDIR /src/SmartWealthManager.API
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SmartWealthManager.API.dll"]