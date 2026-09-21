APP KNOWLEDGE EXTRACTION & DOCUMENTATION PROMPT

Project / App Name: [MEME CAPSULE]

I want you to perform a complete analysis of this project and create a detailed, structured, reusable knowledge document that explains the project as a whole — not just its codebase.

The purpose of this task is to create a reliable “master reference” for [PROJECT / APP NAME] that I can use myself and can also share with other developers, AI agents, content creators, designers, marketers, collaborators, or anyone else who needs to understand the project.

The final document should explain both the PRODUCT and the TECHNICAL IMPLEMENTATION behind it.

Do not treat this as a normal code review. I want you to reconstruct the complete understanding of what this application is, why it exists, how it works, what has been built, what is planned, and how all of its major systems fit together.

---

# 1. FIRST: FULLY INVESTIGATE THE PROJECT

Before writing the report, thoroughly inspect and understand the project.

Analyze the entire available workspace/codebase, including where applicable:

- Project and folder structure
- Source code
- Frontend
- Backend
- Pages and routes
- Components
- UI/UX implementation
- Database and schemas
- APIs
- Authentication and authorization
- AI/ML systems
- External services
- Integrations
- Configuration
- Environment variables and configuration structure
- Dependencies
- State management
- Data models
- Business logic
- User workflows
- Admin systems
- Background processes
- Automation
- Error handling
- Security-related systems
- Performance-related systems
- Deployment/infrastructure
- Documentation
- Existing README/specifications/agent instructions
- TODOs and unfinished work
- Feature flags or experimental systems
- Any other relevant project files

Do not only inspect obvious source files. Look for information that may be spread across the repository.

Understand how the different parts of the application connect with each other rather than describing every file independently.

---

# 2. ANALYZE THE AVAILABLE PROJECT CONVERSATIONS / CONTEXT

If previous project conversations, agent context, task history, instructions, planning discussions, or other available conversation context are accessible to you, analyze them as well.

Use that context to understand:

- Why the project was originally created
- What problem it was intended to solve
- The original product vision
- Important decisions made during development
- Features that were requested
- Features that were changed or redesigned
- Features that were removed
- Features that were discussed but never implemented
- Future plans
- User expectations
- Important terminology
- Product philosophy
- Design decisions
- Technical decisions
- Known problems
- Previous fixes
- Planned improvements
- Any important context that cannot be understood from the current code alone

Do not assume that everything mentioned in previous conversations is currently implemented.

---

# 3. RECONCILE CODEBASE VS. PROJECT CONTEXT

This is extremely important.

Cross-check what you discover in the codebase against the available project discussions/context.

For important features and systems, determine their actual status.

Use a clear implementation-status system such as:

### IMPLEMENTED
The feature/system is actually present and working in the current codebase.

### PARTIALLY IMPLEMENTED
Some portion exists, but the feature is incomplete, limited, broken, or missing important pieces.

### PLANNED
The feature was discussed or intended but is not currently implemented.

### PROPOSED / FUTURE IDEA
The concept was mentioned as a possible future direction but should not be treated as a committed feature.

### EXISTING BUT UNDOCUMENTED
The functionality exists in the codebase but was not clearly documented or discussed.

### OUTDATED / SUPERSEDED
The feature or approach existed previously but appears to have been replaced by another implementation.

### UNKNOWN / NEEDS VERIFICATION
There is insufficient evidence to confidently determine the status.

Never present a planned feature as an existing feature.

Never assume that something works simply because related code exists.

Never invent missing functionality.

When the code and project discussions conflict, explicitly mention the conflict and explain what the current code appears to indicate.

---

# 4. MOST IMPORTANT: HIGHLIGHT THESE CORE QUESTIONS

I specifically want the following questions to be extremely easy to find in the final report.

These are the questions I most commonly need when explaining a project to another person or another AI, so do not bury them somewhere deep inside the document.

Create a dedicated section near the beginning called something like:

## PROJECT AT A GLANCE — CORE PRODUCT QUESTIONS

Clearly and directly answer all of these:

1. What is [PROJECT / APP NAME]?
2. Why does [PROJECT / APP NAME] exist?
3. What problem is it trying to solve?
4. Who is [PROJECT / APP NAME] for?
5. How does [PROJECT / APP NAME] work?
6. What are all of its major features?
7. How is it technically built?
8. How do users interact with it?
9. How does its backend work?
10. How does its AI/ML system work, if applicable?
11. What are its most important concepts and workflows?
12. What is currently implemented vs. planned?
13. What makes the application different or distinctive?
14. What terminology or project-specific concepts should someone understand before working on it?

These answers should be understandable even to someone who has never seen the project before.

Do not answer these with one-line generic summaries.

Give enough context that I can copy this section and provide it directly to another AI agent as the basic context of the application.

Also provide references from the detailed chapters where someone can continue reading for deeper information.

---

# 5. CREATE A PROPER TABLE OF CONTENTS

The final report must begin with a proper Table of Contents.

Organize the document into numbered chapters and subsections.

For example:

1. Executive Project Overview
2. Product Identity & Purpose
3. Target Users & Use Cases
4. Core Features
5. User Experience & Application Workflows
6. Product Architecture
7. Frontend Architecture
8. Backend Architecture
9. Database & Data Model
10. APIs & External Integrations
11. AI / ML Systems
12. Authentication, Security & Permissions
13. Admin / Internal Systems
14. Data Flow & System Workflows
15. UI/UX & Design System
16. Technical Infrastructure
17. Performance & Reliability
18. Current Implementation Status
19. Planned Features & Roadmap
20. Project Terminology / Glossary
21. Product Differentiation & Key Characteristics
22. Known Limitations / Open Issues
23. Development History & Important Decisions
24. Future Direction
25. Final Project Knowledge Summary

Adjust the chapter structure when necessary based on the actual project.

Do not force irrelevant chapters into the report.

If a project does not have an AI system, for example, clearly state that the chapter is not applicable rather than inventing one.

---

# 6. PAGE NUMBERS AND DOCUMENT NAVIGATION

I want this to feel like a proper documentation/report document rather than a long unstructured AI response.

Where the environment supports generating an actual document such as DOCX or PDF:

- Include page numbers.
- Create a proper Table of Contents.
- Use consistent chapter numbering.
- Use consistent heading hierarchy.
- Make the document easy to navigate.
- Use clear chapter and subsection titles.
- Keep the formatting professional and readable.

If the environment cannot reliably generate real paginated documents, do not invent fake page numbers.

Instead, create stable chapter/section numbering and navigation references, and if possible generate a proper DOCX/PDF version separately so that real page numbers and a navigable TOC can be used.

The final report should be easy to search, reference, copy from, and reuse.

---

# 7. CHAPTER 1 — EXECUTIVE PROJECT OVERVIEW

Start with a concise but meaningful overview.

Explain:

- What the application is
- Its primary purpose
- The problem it addresses
- Its general category/type
- Who it is intended for
- The main experience it provides
- Its major systems
- Its current development state

Then provide a short “one-paragraph explanation” of the entire application that could be used to introduce the project to someone unfamiliar with it.

---

# 8. PRODUCT IDENTITY & PURPOSE

Explain the product from a non-technical perspective.

Cover:

- What [PROJECT / APP NAME] is
- Why it exists
- The problem/opportunity behind it
- The user problem it addresses
- The intended outcome for users
- The core product idea
- The product philosophy, if identifiable
- What the application is fundamentally trying to accomplish

Clearly separate confirmed product intent from assumptions.

---

# 9. TARGET USERS & USE CASES

Explain:

- Who the application is designed for
- Primary users
- Secondary users
- Different user types/roles
- What each type of user wants to accomplish
- Common use cases
- Important user scenarios
- Different workflows for different user types

If the project does not explicitly define these, infer only where the evidence is strong and clearly label reasonable inferences.

---

# 10. COMPLETE FEATURE INVENTORY

Create a comprehensive feature inventory.

For every major feature, explain:

- Feature name
- What it does
- Why it exists
- Who uses it
- How the user accesses it
- How it works
- Important interactions
- Related backend systems
- Related database/API systems
- Current implementation status
- Important limitations
- Related future plans

Separate:

- Core features
- Supporting features
- Administrative features
- AI features
- Internal tools
- Experimental features
- Planned features

Do not omit smaller features simply because they appear less important.

---

# 11. USER EXPERIENCE & WORKFLOWS

Explain the application from the user's point of view.

Describe important workflows step by step.

For example:

User enters application
→ chooses an option
→ performs an action
→ data is processed
→ backend responds
→ UI updates
→ user receives result

Document all major workflows that can be identified.

Explain:

- What users see
- What users click
- What happens after each action
- What information is displayed
- What happens in the background
- What happens when something fails
- What happens when a user cancels
- Important states and transitions

This section should be understandable without reading the source code.

---

# 12. TECHNICAL ARCHITECTURE

Explain how the application is technically constructed.

Cover, where applicable:

- Programming languages
- Frameworks
- Libraries
- Frontend architecture
- Backend architecture
- Database
- API architecture
- AI/ML infrastructure
- Authentication
- Authorization
- Storage
- Caching
- Queues/background jobs
- External services
- Deployment
- Hosting
- Infrastructure

Explain why each major technology is being used when that can be established from the project context.

Do not simply provide a dependency list.

Explain how the technologies work together.

---

# 13. FRONTEND ARCHITECTURE

Explain:

- Application structure
- Pages
- Routes
- Components
- Reusable components
- State management
- Data fetching
- API communication
- UI state
- Loading states
- Error states
- Modals/drawers/forms
- Responsive behavior
- Animations
- Design system
- Important frontend conventions

Explain how a user action travels through the frontend.

---

# 14. BACKEND ARCHITECTURE

Explain:

- Backend framework
- Server structure
- Routes/endpoints
- Controllers/services
- Business logic
- Middleware
- Authentication
- Authorization
- Validation
- Background processing
- External service communication
- Error handling
- Logging
- Security considerations

Explain the backend as a system rather than merely listing files.

---

# 15. DATABASE & DATA MODEL

Document:

- Database technology
- Tables/collections
- Important entities
- Relationships
- Primary identifiers
- Important fields
- Data ownership
- User/project relationships
- Important indexes
- Data lifecycle
- Important constraints

Explain how data moves through the application.

Where possible, provide simple textual relationships such as:

User → Project → Content → Processing → Result

Do not invent relationships that are not supported by the code.

---

# 16. API & EXTERNAL INTEGRATIONS

Document all important APIs and integrations.

For each one explain:

- What service it connects to
- Why it is used
- What data is sent
- What data is received
- Which application feature depends on it
- Authentication method, if safely documentable
- Failure behavior
- Important limitations
- Whether it is currently active, optional, experimental, or planned

Never expose actual secrets, API keys, passwords, tokens, private credentials, or sensitive environment values in the report.

---

# 17. AI / ML SYSTEMS

If [PROJECT / APP NAME] contains AI/ML functionality, document it in depth.

Explain:

- Why AI is used
- Which features depend on AI
- Which models/providers are involved
- How model selection works
- Input data
- Prompting/instructions
- Output structure
- Decision-making process
- Tool/function calling, if applicable
- Model configuration
- User/model settings
- Fallback behavior
- Error handling
- AI-related workflows
- Human-in-the-loop systems
- AI limitations
- Known weaknesses
- Planned AI improvements

Clearly distinguish actual implemented AI behavior from ideas that were merely discussed.

Do not expose API keys or sensitive credentials.

---

# 18. SECURITY, PRIVACY & PERMISSIONS

Document the security model as far as the codebase supports.

Cover:

- Authentication
- Authorization
- User isolation
- Role-based access
- Data privacy
- Credential handling
- API security
- Sensitive information handling
- Storage security
- Frontend/backend boundaries
- Potential security-sensitive areas

Do not perform destructive security changes during this analysis.

Do not expose secrets.

---

# 19. UI/UX & DESIGN SYSTEM

Document the visual and interaction design.

Cover:

- Overall visual identity
- Colors
- Typography
- Layout
- Components
- Spacing
- Responsive behavior
- Navigation
- Modals/drawers
- Animations
- Transitions
- Interaction patterns
- Empty states
- Loading states
- Error states
- Accessibility considerations

Explain the design philosophy when it can be identified.

---

# 20. IMPORTANT PROJECT CONCEPTS & TERMINOLOGY

Create a dedicated glossary.

Explain project-specific terms, names, abbreviations, systems, workflows, roles, and concepts.

For each term:

**Term:**  
**Meaning:**  
**Where it is used:**  
**Why it matters:**

This section should help a completely new developer or AI agent understand the language used inside the project.

---

# 21. IMPLEMENTATION STATUS

Create a clear current-state report.

Use a table such as:

| Feature/System | Status | Evidence | Notes |
|---|---|---|---|
| Example Feature | Implemented | Relevant code/workflow | Current behavior |
| Example Feature | Partial | Existing implementation | Missing X |
| Example Feature | Planned | Previous project context | Not currently present |

Use the status categories defined earlier.

This section should provide a reliable snapshot of what the project actually is today.

---

# 22. PLANNED FEATURES & ROADMAP

Separate future work from current functionality.

Document:

- Explicitly planned features
- Future ideas
- Pending improvements
- Known TODOs
- Technical debt
- Potential architectural changes
- Product expansion ideas

Clearly distinguish between:

**Committed / Planned**
and
**Possible / Exploratory**

Do not turn casual ideas from old conversations into confirmed roadmap items.

---

# 23. KNOWN ISSUES, LIMITATIONS & OPEN QUESTIONS

Document:

- Known bugs
- Technical limitations
- UX limitations
- Performance concerns
- Missing functionality
- Incomplete systems
- Unresolved design decisions
- Conflicting project information
- Areas that require future investigation

Do not hide uncertainty.

If something cannot be confirmed, say so.

---

# 24. DEVELOPMENT HISTORY & IMPORTANT DECISIONS

Where sufficient project context exists, explain important development decisions.

For example:

- Why a technology was selected
- Why a feature was redesigned
- Why an architecture changed
- Why an approach was abandoned
- Important problems encountered
- Major refactors
- Important product decisions

This section should preserve useful project history so future developers/AI agents do not unknowingly repeat old decisions or mistakes.

---

# 25. WHAT MAKES THE APPLICATION DISTINCTIVE

Provide a factual explanation of the application's notable characteristics.

Explain:

- Unique product concepts
- Distinctive workflows
- Specialized systems
- Unusual technical architecture
- Interesting AI behavior
- Special UX patterns
- Product-specific terminology
- Anything that clearly distinguishes the project from a generic application

Do not exaggerate or invent competitive advantages.

Base this section on evidence from the project.

---

# 26. CONTENT-READY PROJECT DESCRIPTION

Create reusable descriptions that I can directly copy into other contexts.

Include:

### One-Sentence Description
A concise explanation of what the application is.

### Short Description
A short paragraph suitable for introducing the project.

### Detailed Description
A few paragraphs explaining the application, its purpose, users, major functionality, and overall experience.

### Product Explanation
A natural explanation suitable for someone asking:

“What exactly is [PROJECT / APP NAME]?”

### Technical Explanation
A concise explanation suitable for giving the project context to another developer or coding AI.

### AI Context
If applicable, a concise explanation specifically describing the application's AI systems and their purpose.

These should be based on the actual project and should not contain invented marketing claims.

---

# 27. AI-HANDOFF / PORTABLE PROJECT CONTEXT

Create a final section specifically designed to be copied and provided to another AI agent.

It should contain the essential context another AI would need before working on [PROJECT / APP NAME].

Include:

- What the project is
- Why it exists
- Who uses it
- Core features
- Major workflows
- Architecture
- Important technologies
- Backend
- Database
- AI systems
- Important terminology
- Current implementation status
- Important constraints
- Planned direction
- Known issues
- Important project-specific rules

Write this section so that it can stand on its own without requiring the other AI to read the entire report.

---

# 28. FINAL MASTER SUMMARY

End the document with a comprehensive but readable summary answering:

- What is [PROJECT / APP NAME]?
- Why does it exist?
- Who is it for?
- What does it currently do?
- How does it work?
- What are its major systems?
- What is its technical architecture?
- What is its current state?
- What is planned next?
- What are its defining concepts?
- What should a new developer/AI understand before touching the project?

This should function as the final “mental model” of the entire application.

---

# 29. EVIDENCE & ACCURACY RULES

Accuracy is more important than making the report sound complete.

Follow these rules:

- Do not invent features.
- Do not invent technical architecture.
- Do not assume a feature works just because related code exists.
- Do not treat old plans as current functionality.
- Do not expose secrets or private credentials.
- Do not silently resolve contradictions.
- Clearly identify uncertainty.
- Clearly distinguish implemented, partial, planned, proposed, and unknown items.
- Prefer current codebase evidence when describing current implementation.
- Use project conversation/history to understand intent and development context.
- When code and conversation disagree, explicitly identify the discrepancy.
- Do not claim to have verified something that you could not actually inspect.

---

# 30. REPORT QUALITY REQUIREMENTS

The final result should feel like a professionally prepared project knowledge/reference document.

It should be:

- Detailed
- Structured
- Easy to navigate
- Easy to search
- Easy to copy from
- Technically useful
- Product-aware
- Understandable to non-developers
- Useful to developers
- Useful to AI agents
- Useful for future content planning
- Useful for onboarding
- Useful for future product planning

Do not make it unnecessarily repetitive just to increase its length.

However, do not aggressively summarize important information merely to keep the document short.

The goal is comprehensive project understanding.

---

# 31. IMPORTANT: DO NOT MODIFY THE PROJECT DURING THE ANALYSIS

Unless I explicitly ask you to make changes, this task is documentation/analysis only.

Do not:

- Modify source code
- Refactor code
- Delete files
- Rename files
- Change dependencies
- Change configuration
- Change database schemas
- Change application behavior

Your job is to investigate, understand, reconcile, and document the project.

---

# 32. FINAL OUTPUT FORMAT

Produce the report in a professional chapter-based structure.

At minimum, the final structure should be:

1. Cover / Project Title
2. Table of Contents
3. Project at a Glance — Core Product Questions
4. Executive Overview
5. Product Identity & Purpose
6. Target Users & Use Cases
7. Complete Feature Inventory
8. User Experience & Workflows
9. Technical Architecture
10. Frontend Architecture
11. Backend Architecture
12. Database & Data Model
13. APIs & Integrations
14. AI / ML Systems
15. Security & Privacy
16. UI/UX & Design System
17. Important Concepts & Terminology
18. Implementation Status
19. Roadmap & Planned Features
20. Known Issues & Limitations
21. Development History & Decisions
22. Product Characteristics / Differentiators
23. Content-Ready Descriptions
24. AI-Handoff Project Context
25. Final Master Summary

Adapt the structure according to the actual project.

---

# 33. VERY IMPORTANT — MAKE THE COMMONLY NEEDED INFORMATION EASY TO FIND

The following information is especially important to me and must not be buried inside the report:

- What is [PROJECT / APP NAME]?
- Why does it exist?
- What problem does it solve?
- Who is it for?
- How does it work?
- What are all of its features?
- How is it technically built?
- How do users interact with it?
- How does the backend work?
- How does the AI system work?
- What are the important concepts and workflows?
- What is implemented vs. planned?
- What makes the application distinctive?
- What terminology should someone know?

Treat these as the project's **Core Knowledge Set**.

Put them together near the beginning in an easily copyable section, and then expand upon them throughout the relevant chapters.

The purpose is that if I only need to give another AI a quick understanding of the project, I can copy this section directly instead of searching through the entire report.

---

# 34. FINAL INSTRUCTION

Do not give me a generic project summary.

I want you to reconstruct the actual identity and complete working model of [PROJECT / APP NAME] from the available evidence.

Think of the final report as the project's long-term knowledge base:

PRODUCT CONTEXT + USER EXPERIENCE + FEATURES + BUSINESS LOGIC + TECHNICAL ARCHITECTURE + AI SYSTEMS + DEVELOPMENT HISTORY + CURRENT STATE + FUTURE DIRECTION.

Someone who has never seen this project should be able to read the report and develop a strong understanding of what [PROJECT / APP NAME] is, why it exists, how it works, what has actually been built, and where it is going.

At the same time, an AI coding agent should be able to use the report as reliable project context before planning or implementing future work.

Most importantly, make the report practical rather than merely descriptive. I should be able to take individual chapters or sections out of it and reuse them for:

- Giving context to other AI agents
- Developer onboarding
- Technical planning
- Feature planning
- Product documentation
- Content planning
- Marketing/content writing
- Project presentations
- Client/stakeholder explanations
- Future development decisions

The final document should therefore be treated as a reusable, long-term **Master Knowledge Document for [PROJECT - MEME CAPSULE]**, not simply a one-time analysis.