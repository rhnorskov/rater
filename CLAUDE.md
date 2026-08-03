# rater

## Conventions

Purpose-built components colocated in `src/app/**` are imported relatively; everything
crossing out of the route folder uses the `#/` alias.

```ts
// src/app/auth/signin/page.tsx
import { SignInForm } from "./signin-form";        // colocated, single-route
import { Button } from "#/components/ui/button"; // shared
```
