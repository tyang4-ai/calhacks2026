# Figma MCP server: tools, setup, best practices

> Sources:
> - https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
> - https://github.com/figma/mcp-server-guide
> - https://github.com/figma/mcp-server-guide/blob/main/server.json
> Fetched: 2026-10-24.
>
> The remote server is `https://mcp.figma.com/mcp` (streamable HTTP), version 2.2.163 in the repo's server.json.
> Only the build's planning session and its design lead have the Figma tools. Backend builders and feature agents don't need this page.

## Tools (from Figma's developer docs)

From https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/, read through a fetch tool on 2026-10-24. The tables are a faithful summary of that page, not a copy. "Remote only" means the tool exists on the remote server (`https://mcp.figma.com/mcp`) and not on the desktop app's local server.

### Read tools

| Tool | What it does | File types | Where |
|---|---|---|---|
| `download_assets` | Downloads exports and original source images, up to 20 nodes per call | Design, FigJam, Slides | Remote only |
| `get_code_connect_map` | Gets Code Connect mappings for selected instances | Design | Both |
| `get_code_connect_suggestions` | Suggests Code Connect mappings (used by the figma-code-connect skill) | Design | Both |
| `get_context_for_code_connect` | Gets component metadata for Code Connect templates | Design | Remote only |
| `get_design_context` | Gets design context and code (React and Tailwind by default) for a layer or selection | Design, Make | Both |
| `get_figjam` | Converts FigJam diagrams to XML | FigJam | Both |
| `get_generative_plugin` | Reads a generative plugin's source | none | Remote only |
| `get_libraries` | Lists subscribed and available libraries | Design | Remote only |
| `get_metadata` | Gets a lightweight XML outline of a selection | Design | Both |
| `get_motion_context` | Gets keyframe animation data and code snippets | Design | Both |
| `get_screenshot` | Takes a screenshot of a selection | Design, FigJam, Slides | Both |
| `get_shader` | Reads a shader's source | none | Both |
| `get_variable_defs` | Lists the variables and styles used in a selection | Design | Both |
| `list_file_shaders` | Lists shaders used in a file | Design | Remote only |
| `list_generative_plugins` | Lists generative plugins in your library | none | Remote only |
| `list_shaders` | Lists shader effects and fills in your library | none | Both |
| `search_design_system` | Searches libraries for components, variables and styles | Design | Remote only |
| `whoami` | Your identity, plans and seats | none | Remote only |

### Write tools

| Tool | What it does | File types | Where |
|---|---|---|---|
| `add_code_connect_map` | Maps a Figma component to a code component | Design | Both |
| `create_generative_plugin` | Creates a generative plugin starter | none | Remote only |
| `create_new_file` | Creates a blank Design, FigJam or Slides file | none | Remote only |
| `create_shader` | Creates a shader effect or fill starter | none | Remote only |
| `generate_diagram` | Generates a FigJam diagram from a description or Mermaid | none | Remote only |
| `generate_figma_design` | Sends live web UI to Figma as design layers | Design | Remote only |
| `generate_image` | Generates and places an image (uses Figma AI credits) | Design, FigJam, Slides | Remote only |
| `html_to_figma` | Converts an HTML document (up to 50 MB) into design layers | Design | Remote only |
| `send_code_to_figma` | Imports a local project as a Make file or code layer | Make, Design | Remote only |
| `send_code_connect_mappings` | Confirms suggested Code Connect mappings | Design | Both |
| `update_generative_plugin` | Updates a generative plugin's source | none | Remote only |
| `update_shader` | Updates a shader's source | none | Remote only |
| `upload_assets` | Uploads images and SVGs, up to 60 files of 10 MB each per call | Design, FigJam, Slides | Remote only |
| `use_figma` | Creates, edits and inspects content in files | Design, FigJam, Slides, Specs | Remote only |

### Figma Weave tools

`weave_list_tools`, `weave_get_tool_inputs`, `weave_upload_asset`, `weave_run_tool`, `weave_get_tool_run_output`, `weave_cancel_tool_run`, `weave_find_model`, `weave_run_model`, `weave_get_model_run_output`. Runs need a paid standalone Weave account and use Weave credits.

### Prompt and skills

- MCP prompt `create_design_system_rules`: writes a rules file so the agent's code fits your codebase and design system.
- Skills the page names: `figma-use`, `figma-use-figjam`, `figma-use-slides` (code to design), `figma-spec` (Figma Specs in `use_figma`), `figma-generative-plugins`, `figma-shaders`, `figma-code-connect`.

### Plan and limit notes from the page

- Rate limits apply to the read tools. Some write tools are exempt. `generate_figma_design` doesn't count toward the standard limits.
- `generate_image` uses Figma AI credits. `send_code_to_figma` is free on the first import, then prompting uses credits.
- Edit access is needed to write into an existing file. Creating plugins and shaders needs a `planKey` from `whoami`.

## What the connector in Gordon's Claude session exposes (checked 2026-10-24)

The Figma connector attached to the planning session lists these tool names, which mostly match the docs above. Differences: the session also has `create_session` (the server's instructions say to call it with the file key before other file tools), `get_figma_skill` and `export_video`, which the docs page doesn't list yet. The session does not list `generate_figma_design` or `html_to_figma`.

Server instructions in short (from the connector itself): call `create_session` once the file key is known, reuse its session ID on later file tools, load the `figma-use` skill before `use_figma`, call `search_design_system` first when building in a file, and load `figma-design-to-code` before `get_design_context`. A figma.com URL `figma.com/design/:fileKey/:fileName?node-id=1-2` gives the file key, and the node ID with `-` turned into `:`.

## The figma/mcp-server-guide README (verbatim, main branch, Oct 20, 2026)

The VS Code, Cursor, Gemini CLI and icon sections are left out.

The Figma MCP server brings Figma directly into your workflow by providing important design information and context to AI agents generating code from Figma design files.

> [!NOTE]
> Rate limits apply to Figma MCP server tools that read data from Figma. Some tools, such as those that write to Figma files, are exempt from the rate limits.
> <br><br>
> Users on the Starter plan or with View or Collab seats on paid plans will be limited to up to 6 tool calls per month.
> <br><br>
> Users with a [Dev or Full seat](https://help.figma.com/hc/en-us/articles/27468498501527-Updates-to-Figma-s-pricing-seats-and-billing-experience#h_01JCPBM8X2MBEXTABDM92HWZG4) on the [Professional, Organization, or Enterprise plans](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features) have per minute rate limits, which follow the same limits as the Tier 1 [Figma REST API](https://developers.figma.com/docs/rest-api/rate-limits/). As with Figma’s REST API, Figma reserves the right to change rate limits.

For the complete set of Figma MCP server docs, see our [developer documentation](https://developers.figma.com/docs/figma-mcp-server/). By using the Figma MCP server and the related resources (including these skills), you agree to the [Figma Developer Terms](https://www.figma.com/legal/developer-terms/). These skills are currently available as a Beta feature.

### Features

- **Write to the canvas** (remote server only): Create and modify native Figma content directly from your MCP client. With the right skills, agents can build and update frames, components, variables, and auto layout in your Figma files using your design system as the source of truth.

    **Note:** We're quickly improving how Figma supports AI agents. The write to canvas feature will eventually be a usage-based paid feature, but is currently available for free during the beta period.

- **Generate placeholder images**: When source, captured, or library images are unavailable, agents can use `generate_image` after asking permission and disclosing Figma AI credit usage. Generated images are uploaded with `upload_assets` and applied to the design.

- **Generate code from selected frames**

  Select a Figma frame and turn it into code. Great for product teams building new flows or iterating on app features.

- **Extract design context**

  Pull in variables, components, and layout data directly into your IDE. This is especially useful for design systems and component-based workflows.

- **Code smarter with Code Connect**

  Boost output quality by reusing your actual components. Code Connect keeps your generated code consistent with your codebase.

  [Learn more about Code Connect →](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)

- **Generate Figma designs from web pages** *(rolling out)*

  Capture, import, or convert a web page into a Figma design directly from your AI coding agent.

### Installation & Setup

#### Connect to the Figma MCP server

Different MCP clients require slightly different setups. Follow the instructions below for your specific client to connect to the Figma MCP server.

##### Claude Code

The recommended way to set up the Figma MCP server in Claude Code is by installing the Figma Plugin, which includes MCP server settings as well as Agent Skills for common workflows.

Run the following command to install the plugin from Anthropic's official plugin marketplace.

```bash
claude plugin install figma@claude-plugins-official
```

Learn more about Anthropic's [Claude Code Plugins](https://claude.com/blog/claude-code-plugins) and [Agent Skills](https://claude.com/blog/skills).

<details>
<summary>Manual setup</summary>

1. Open your terminal and run:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

2. Use the following commands to check MCP settings and manage servers:

- List all configured servers
  ```bash
  claude mcp list
  ```
- Get details for a specific server
  ```bash
  claude mcp get my-server
  ```
- Remove a server
  ```bash
  claude mcp remove my-server
  ```

For more information, see [Anthropic's official documentation](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/tutorials#set-up-model-context-protocol-mcp).

</details>

##### Other editors

Other code editors and tools that support Streamable HTTP can also connect to the Figma MCP server.

If you're using a different editor or tool, check its documentation to confirm it supports Streamable HTTP based communication. If it does, you can manually add the Figma MCP server using this configuration:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Prompting your MCP client

The Figma MCP server introduces a set of tools that help LLMs translate designs in Figma. Once connected, you can prompt your MCP client to access a specific design node.

To provide Figma design context to your AI client:

1. Copy the link to a frame or layer in Figma.
2. Prompt your client to help you implement the design at the selected URL.

> [!NOTE]
> Your client won't be able to navigate to the selected URL, but it will extract the node-id that is required for the MCP server to identify which object to return information about.

### Tools and skills

Figma maintains a list of tools provided by the Figma MCP server in the [developer documentation](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/).

You can also learn more about the skills included with the Figma plugin for [supported agents](https://help.figma.com/hc/en-us/articles/32132100833559#h_01K25F7RBRZKCATVJHNXCS6KXW) in the [Figma Help Center](https://help.figma.com/hc/en-us/articles/39166810751895). Depending on the agent, you may also see the terms `connector`, `extension`, or `power`; these include the same set of skills.

This repo also contains standalone workflow skills that are not bundled with the Figma plugin:
- [`workflow-skills/video-interaction-mapper`](workflow-skills/video-interaction-mapper): Turns UI recordings into annotated Figma storyboards
- [`workflow-skills/generate-project-plan`](workflow-skills/generate-project-plan): Turn a PRD (plus optional codebase grounding) into a FigJam project plan board

## MCP best practices

The quality of the generated code depends on several factors. Some controlled by you, and some by the tools you're using. Here are some suggestions for clean, consistent output.

### Structure your Figma file for better code

Provide the best context for your design intent, so the MCP and your AI assistant can generate code that's clear, consistent, and aligned with your system.

- **Use components** for anything reused (buttons, cards, inputs, etc.)
- **Link components to your codebase** via Code Connect. This is the best way to get consistent component reuse in code. Without it, the model is guessing.
- **Use variables** for spacing, color, radius, and typography.
- **Name layers semantically** (e.g. `CardContainer`, not `Group 5`)
- **Use Auto layout** to communicate responsive intent.

> [!TIP]
> Resize the frame in Figma to check that it behaves as expected before generating code.

- **Use annotations and dev resources** to convey design intent that's hard to capture from visuals alone, like how something should behave, align, or respond.

### Write effective prompts to guide the AI

MCP gives your AI assistant structured Figma data, but your prompt drives the result. Good prompts can:

- Align the result with your framework or styling system
- Follow file structure and naming conventions
- Add code to specific paths (e.g. `src/components/ui`)
- Add or modify code in existing files instead of creating new ones
- Follow specific layout systems (e.g. grid, flexbox, absolute)

**Examples:**

- "Generate iOS SwiftUI code from this frame"
- "Use Chakra UI for this layout"
- "Use `src/components/ui` components"
- "Add this to `src/components/marketing/PricingCard.tsx`"
- "Use our `Stack` layout component"

Think of prompts like a brief to a teammate. Clear intent leads to better results.

### Trigger specific tools when needed

The MCP supports different tools, and each one provides your AI assistant with a different kind of structured context. Sometimes, the assistant doesn't automatically pick the right one, especially as more tools become available. If results are off, try being explicit in your prompt.

- **get_design_context** provides a structured **React + Tailwind** representation of your Figma selection. This is a starting point that your AI assistant can translate into any framework or code style, depending on your prompt.
- **get_variable_defs** extracts the variables and styles used in your selection (color, spacing, typography, etc). This helps the model reference your tokens directly in the generated code.

For example, if you're getting raw code instead of tokens, try something like:

- "Get the variable names and values used in this frame."

### Add custom rules

Set project-level guidance to keep output consistent—just like onboarding notes for a new developer. These are things like:

- Preferred layout primitives
- File organization
- Naming patterns
- What not to hardcode

You can provide this in whatever format your MCP client uses for instruction files.

**Examples:**

##### Ensure consistently good output

```yaml
## Figma MCP Integration Rules
These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

### Required flow (do not skip)
1. Run get_design_context first to fetch the structured representation for the exact node(s).
2. If the response is too large or truncated, run get_metadata to get the high‑level node map and then re‑fetch only the required node(s) with get_design_context.
3. Run get_screenshot for a visual reference of the node variant being implemented.
4. Only after you have both get_design_context and get_screenshot, download any assets needed and start implementation.
5. Translate the output (usually React + Tailwind) into this project's conventions, styles and framework.  Reuse the project's color tokens, components, and typography wherever possible.
6. Validate against Figma for 1:1 look and behavior before marking complete.

### Implementation rules
- Treat the Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style.
- Replace Tailwind utility classes with the project's preferred utilities/design‑system tokens when applicable.
- Reuse existing components (e.g., buttons, inputs, typography, icon wrappers) instead of duplicating functionality.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data‑fetch patterns already adopted in the repo.
- Strive for 1:1 visual parity with the Figma design. When conflicts arise, prefer design‑system tokens and adjust spacing or sizes minimally to match visuals.
- Validate the final UI against the Figma screenshot for both look and behavior.
```

##### Claude Code

```markdown
# MCP Servers

## Figma MCP server rules

- The Figma MCP server provides an assets endpoint which can serve image and SVG assets
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or an SVG, use that image or SVG source directly
- IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
- IMPORTANT: do NOT use or create placeholders if a localhost source is provided
```

##### General quality rules

```
- IMPORTANT: Always use components from `/path_to_your_design_system` when possible
- Prioritize Figma fidelity to match designs exactly
- Avoid hardcoded values, use design tokens from Figma where available
- Follow WCAG requirements for accessibility
- Add component documentation
- Place UI components in `/path_to_your_design_system`; avoid inline styles unless truly necessary
```

Adding these once can dramatically reduce the need for repetitive prompting and ensures that teammates or agents consistently follow the same expectations.

Be sure to check your IDE or MCP client's documentation for how to structure rules, and experiment to find what works best for your team. Clear, consistent guidance often leads to better, more reusable code with less back-and-forth.

#### Break down large selections

Break screens into smaller parts (like components or logical chunks) for faster, more reliable results.

Large selections can slow the tools down, cause errors, or result in incomplete responses, especially when there's too much context for the model to process. Instead:

1. Generate code for smaller sections or individual components (e.g. Card, Header, Sidebar)
2. If it feels slow or stuck, reduce your selection size

This helps keep the context manageable and results more predictable, both for you and for the model.

If something in the output doesn't look quite right, it usually helps to revisit the basics: how the Figma file is structured, how the prompt is written, and what context is being sent. Following the best practices above can make a big difference, and often leads to more consistent, reusable code.

### Bringing Make context to your agent

The Make + MCP integration makes it easier to take prototypes from **design to production**. By connecting Make projects directly to your agent via MCP, you can extract resources and reuse them in your codebase. This reduces friction when extending prototypes into real applications, and ensures that design intent is faithfully carried through to implementation.

With this integration, you can:

- **Fetch project context** directly from Make (individual files or the whole project)
- **Prompt to use existing code components** instead of starting from scratch
- **Extend prototypes with real data** to validate and productionize designs faster

#### How it works

> [!NOTE]
> This integration leverages the MCP **resources capability**, which allows your agent to fetch context directly from Make projects. It is available only on clients that support MCP resources.

##### Steps to fetch resources from Make

1. **Prompt your agent to fetch context** by providing a valid Make link
2. **Receive a list of available files** from your Make project
3. **Download the files you want to fetch** when prompted

#### Example workflow

**Goal:** Implement a popup component in your production codebase that matches the design and behavior defined in Make.

1. Share your Make project link with your agent.
2. Prompt the agent: _"I want to get the popup component behavior and styles from this Make file and implement it using my popup component."_

Your agent will fetch the relevant context from Make and guide you in extending your existing popup component with the prototype's functionality and styles.
