# Recordable support

- **Questions, bugs and feature requests:** open an issue at https://github.com/arshdwani/recordable/issues.
- Include the request key or the Recordable tab you were on, what you expected and what happened. Leave out
  employee names, medical details and any other personal or confidential data.
- **Common questions**
  - *Employees can't find "Injury or illness" on the portal.* Jira's API can't put a request type in a portal group.
    In the service project's settings, open Request types, find "Injury or illness", and choose ••• > Portal group >
    Edit. The Recordable page links there.
  - *Where is the Recordable panel on a request?* It's the **Recordable** section in the details sidebar. Its badge
    shows the clock, for example "Report to OSHA in 22h" or "Log by Dec 1".
  - *A request didn't become a case.* Recordable opens new requests of the "Injury or illness" request type. For any
    other request, use **Treat as injury or illness** in its ••• menu.
  - *Why does Recordable ask a question instead of deciding?* The rules need a fact the request doesn't give, for
    example the dose a clinic recommended, or whether an earlier injury had healed. Answer it in the panel.
  - *No Assets on my site?* Recordable keeps establishments in its own register; add them on the Establishments tab.
- Privacy: see `PRIVACY.md`. Terms: see `TERMS.md`. Response target: 2 business days.
