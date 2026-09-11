# Job-source policy

This project takes its public-feed discovery approach from the Jobs category of [public-apis/public-apis](https://github.com/public-apis/public-apis).

## Enabled adapter: Remotive

- Endpoint: `https://remotive.com/api/remote-jobs`
- Purpose: discovery of active remote opportunities.
- Attribution: every result must show **Remotive** and link to the original posting.
- Refresh policy: server responses are cached for one hour; do not poll the source more than necessary.
- Application: candidates apply on the original job link. This app never submits an application through the public API.

## Deliberately not enabled

No source that requires scraping LinkedIn, Indeed, Naukri, or an employer website is enabled by default. Add an official API or an authorised browser connector for each source before enabling it.
