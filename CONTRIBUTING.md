# Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to grant the rights to use your contribution. See
https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will determine whether you need to
provide a CLA and decorate the pull request appropriately. Follow the bot's
instructions. You only need to do this once across Microsoft repositories.

This project follows the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
See the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact opencode@microsoft.com with additional questions or comments.

## How to contribute

Contributions arrive through pull requests from forks:

1. Fork this repository and create a branch in your fork.
2. Open a pull request against `main`.
3. The `build-and-test` check must pass, and a code owner
   (see [CODEOWNERS](.github/CODEOWNERS)) must approve the latest push.
   All review threads must be resolved. Pull requests are squash-merged.

Direct pushes to `main` are not permitted for anyone.

## Sample requirements

The Azure SQL sample should mirror the
[PostgreSQL sample](https://github.com/AzureAppService/app-service-builder-postgresql)
and meet these requirements:

- **Managed identity is required.** The app must connect to Azure SQL Database
  with Microsoft Entra authentication via managed identity. Do not use SQL
  authentication, passwords, or connection strings containing secrets.
- **West US 2 is the default region** for infrastructure and documentation.
- Extend `.github/workflows/validate.yml` so the `build-and-test` job builds and
  tests the sample. Keep `permissions: contents: read` and pin every action to a
  full commit SHA (SHA pinning is enforced for this repository).
- Add the sample's package ecosystem to `.github/dependabot.yml`.

## Safety

Database integration tests require an explicitly confirmed dedicated seeded
test database. Never use a production database or commit tokens, passwords,
environment files, customer data, or resource-specific credentials.
