# Governance

AaaS uses a maintainer-led, contribution-friendly governance model.

## Roles

- **Users** use AaaS and provide feedback.
- **Contributors** submit issues, discussions, documentation, tests, or code.
- **Maintainers** review changes, set releases, manage security reports, and
  protect the product and compatibility boundaries.

Contribution history, sound judgment, respectful collaboration, and sustained
ownership may lead to broader maintainer responsibility. There is no automatic
promotion based on commit count.

## Decision making

Routine fixes and documentation changes are decided through pull-request
review. Changes to the object model, privacy boundary, runtime isolation,
protocol surface, or compatibility contract should begin with a public design
issue unless disclosure would create a security risk.

Maintainers seek rough consensus. When consensus is not possible, the project
lead makes the final decision and records the reasoning in the issue or pull
request.

## Releases

The project follows Semantic Versioning for the installable package:

- patch: compatible fixes and documentation;
- minor: compatible features and new integrations;
- major: incompatible public API, installer, Skill, or data-model changes.

Release notes are recorded in [CHANGELOG.md](CHANGELOG.md). Gated production or
provider acceptance is reported separately in
[docs/VERIFICATION.md](docs/VERIFICATION.md).

## Security

Security decisions may be handled privately until a fix is available.
Maintainers coordinate disclosure through GitHub Security Advisories according
to [SECURITY.md](SECURITY.md).

## Changes to governance

Governance changes use the same pull-request process as code and should explain
the problem, affected contributors, and transition plan.
