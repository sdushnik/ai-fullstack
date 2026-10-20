<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Every backend call goes through `src/services` (`api` from `@/services`); UI never touches storage or fetch directly — keeps the backend swappable.
- `src/services/mock.ts` is the stand-in backend and must enforce the same rules a real server would (auth, ownership, validation, cascade deletes) so UI behaviour matches production.
- Pure journal logic (validation, filtering/sorting, statistics) lives in `src/lib` and is unit-tested in `src/test`.
- Signed-in pages live under `src/routes/_authenticated/` (client-only guard via `api.auth.getCurrentUser`).
