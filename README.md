# Orbit Apply

A local, review-first frontend for an AI/ML job application workflow.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Product flow

1. A scheduled search gathers only fresh, unique openings that match the saved profile.
2. The review queue presents exactly nine verified roles, their links, fit reasons, and tailored drafts.
3. The candidate approves selected roles.
4. A connected browser session can prefill ordinary application fields using confirmed profile answers.
5. It pauses for every unclear, sensitive, legal, demographic, terms, CAPTCHA, or final-submit question. The candidate must confirm immediately before submission.

## Before live hosting

- Connect only job boards or employer sites for which the candidate has an authorised signed-in session or an official API.
- Keep source-specific rate limits and Terms of Service intact. A hosted app cannot promise unlimited submissions or bypass anti-bot protections.
- Store résumé and profile answers securely and encrypt them at rest. Do not expose them in client-side code.
- Add an authenticated backend, database, job-source connectors, WhatsApp Business/API provider (if wanted), and a scheduled worker.

## Current scope

This static prototype intentionally does not scrape job boards, transmit the résumé, log into accounts, or submit applications. Those actions need explicit user approval at the time they occur and authorised connections.
