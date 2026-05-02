# Issue tracker: Local markdown

Issues are tracked as markdown files under `.scratch/<feature>/`.

## Workflow

1. Create a feature directory under `.scratch/`: `.scratch/my-feature/`
2. Write issue/task files inside it
3. Move or prefix files to reflect triage state

## File layout

```
.scratch/
  my-feature/
    needs-triage/     # newly filed, not yet evaluated
    needs-info/       # waiting on reporter
    ready-for-agent/  # fully specified, agent can pick up
    ready-for-human/  # needs human hands
    wontfix/          # decided not to action
```

## Tools

No external CLI needed — plain files and directories.
