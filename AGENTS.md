<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Beacon Box — Project Context

Beacon Box is an AI-powered, voice-enabled in-store shopping assistant for grocery and retail stores.

## Product Goal

Help shoppers locate and understand products without requiring a mobile app or assistance from store employees.

Core value proposition: **Ask. Find. Pick.**

## Core Experience

A shopper walks up to a display and asks a question such as:

> Where can I find frozen tortillas?

The assistant should:

1. Interpret the spoken request.
2. Search the product catalog and current inventory.
3. Display the matching product and its precise location.
4. Provide directions such as `Aisle 7 → Rack 3 → Second shelf`.
5. Optionally activate a shelf LED or electronic shelf label.

## Supported Questions

The experience should eventually answer:

- Where is a product?
- Is it in stock?
- Where exactly is it on the shelf?
- What alternatives are available?
- When will it be back in stock?
- What products are available in this aisle?
- Product-specific questions such as usage, safety, and expected duration.

## Product Data

Each product may contain:

- SKU
- Name
- Category
- Description and image
- Inventory status
- Aisle
- Rack or section
- Shelf level
- Alternatives
- Product Q&A information

## Primary Screens

- Default/attract screen
- Active listening screen
- Question-and-answer state
- Result map
- Product detail page
- Advertisement video

## Product Principles

- Optimize for a fast, walk-up-and-ask interaction.
- Design for a shared public touchscreen, not a personal mobile device.
- Make product location visually prominent and immediately understandable.
- Prefer precise shelf-level directions over generic aisle information.
- Clearly distinguish sponsored recommendations from organic results.
- Account for noisy stores, accessibility, and unreliable connectivity.
- Never claim an item is available unless inventory data supports it.

## Team

Parag, Joaquin, and Andrew.
