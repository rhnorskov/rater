# Rating model

How a rating is produced. Users never enter a number; they state preferences between
two items and the number is derived.

## Problem

Absolute ratings are unreliable. People cannot consistently map a film to a point on a
1–10 scale — the same film gets a different number depending on mood, recency, and what
they rated last. Relative judgements are easy and stable: *The Shawshank Redemption* is
better than *The Dark Knight*, and both are far better than *National Treasure*.

Pairwise preference is also what the field converged on for eliciting human judgement —
preference data for language models is collected as comparisons, not scores, for exactly
this reason.

## Personal ranking

**Each user has one totally ordered list.** New titles are placed by binary insertion:
the item is compared against the midpoint of the current list, then recursively against
the midpoint of the surviving half, until its position is fixed. That is ~log₂(n)
comparisons — about 10 at a thousand films.

Transitivity holds **by construction**. If A is above B and B is above C, then A is
above C, without A and C ever being compared. This is the central requirement, and it is
a property of maintaining a sorted list rather than something the algorithm has to infer.

**What a placement establishes is narrower than it looks.** The candidate is always
compared against both films it ends up between — that falls out of the search and holds for
every list size and every landing position — so a placement is exact with respect to its
immediate neighbours. Everything else is inference: five answers place a film in a list of
forty, which leaves thirty-five films ordered against it without ever being compared.

So a placement that feels wrong is almost never a placement error. Either the neighbours it
landed between are themselves mis-ordered from an earlier insertion, in which case the
error was inherited rather than introduced, or the answer given was a coin-flip. Binary
insertion converges on exactly the comparisons the user is least sure about, so the last
answer of every run is the least reliable one. Asking more questions cannot help: the range
narrows to a single position, and there is no residual uncertainty left to spend them on.

Order is stored with **LexoRank** keys — inserting between two neighbours rewrites one
key instead of reindexing the list, and it avoids the precision drift that plain
fractional indexing accumulates. Keys lengthen on repeated inserts into the same gap, so
a periodic rebalance job is required.

**The order is the source of truth.** Because transitivity is imposed, every pairwise
fact about a user's taste is recoverable from their list. A comparison log cannot
express anything the order does not already encode; its only uses are confidence
weighting and history, not reconstruction.

Reordering is therefore safe. Any drag produces another valid total order — no
contradiction is possible, and nothing needs reconciling.

## Personal score

Rank maps to 1–10 through the **inverse normal CDF**, not linearly:

```
percentile → z-score → clamp ±2σ → scale to 1–10
```

Linear mapping assumes quality is uniformly spaced across ranks. It isn't — most films
cluster in the middle, so linear over-separates films 50 and 51 while under-separating
the top five. With 101 films, adjacent-rank gaps come out at 0.06 near the middle and
0.24 near the top, which matches how people actually feel about their lists.

**This is presentation, not measurement.** A single user's ordering contains no spacing
information at all — rank is ordinal. Any mapping is a chosen shape. Two consequences:
the score shifts as the list grows (a new entry changes the denominator), and the shape
is imposed rather than observed. Real magnitude comes only from the global model.

## Global ranking

**Batch-fit Bradley–Terry** over the pairwise data implied by every user's order. Each
film gets one scalar; scalars are totally ordered, so the global ranking is transitive by
construction too.

Magnitude is recovered from **cross-user disagreement rates**. If 98% of users rank A
above B, the fitted gap is large; at 55% it is small. Degree of preference therefore
never has to be asked for — the UI stays a binary, one-second decision, and
"significantly better" emerges from the aggregate.

Three properties follow:

- **Power users need down-weighting.** A list of *k* films yields *k(k−1)/2* pairs by
  transitive closure. 100 films is 4,950 pairs against 45 for a 10-film list — 110× the
  weight for 10× the effort. Unweighted, the global ranking becomes the opinion of a
  handful of people.
- **Scores cannot update live.** Refitting is a batch job, so global numbers lag personal
  ones.
- **Connectivity is required.** A film only ranks if it is connected to the pool through
  some chain of comparisons. Isolated titles get a "not enough data" state, never a
  fabricated score.

## Rejected: Elo

Elo's online update rule is path-dependent — ratings depend on which matchups happened
in what order, and nothing enforces transitivity. A > B and B > C does not give A > C
without A and C meeting.

Note this objection applies to the *incremental update rule*, not to latent-score models
generally. Bradley–Terry, of which Elo is a crude online approximation, is fitted in
batch over all data at once and produces a single scalar per item, which is inherently
transitive. That is why it survives here and Elo does not.

## Rejected: seeding magnitude from public ratings

Using IMDb or TMDB scores as a Bayesian prior would solve cold start — sparse films sit
near their prior, well-compared films are dominated by real data, and the influence
decays per film with no cutover date.

Rejected because it imports the artefact the product exists to replace. Public averages
carry review-bombing, recency bias, genre skew, and heavy clustering in 6–8 because
people won't use the bottom half of the scale. Early rankings would simply look like
IMDb's — invisible differentiation at exactly the moment it needs to be visible.

Instead: accept that global quality improves with volume, and say so in the UI. Surface
comparison counts; withhold scores below a threshold.

**A neutral prior is still required.** Unregularised Bradley–Terry diverges to ±∞ for
undefeated or winless items, so an undefeated obscurity would top the chart on one
comparison. Shrink toward the population mean via an L2 penalty or virtual win/loss
pairs. This is numerical stability, not editorial — "we don't know yet" rather than
"IMDb thinks it's a 7.4".

## Open questions

- **Onboarding.** Binary insertion needs an existing list. The first film has nothing to
  compare against and the list isn't useful for a dozen or so entries — all cost, no
  payoff, before any number appears.

  Half answered: the bottleneck was recall, not comparison. Asking someone to name the
  films they have watched is slow and forgetful; showing them a title is neither. So the
  catalogue is offered instead — drawn from the most-voted end, where a hit is likeliest —
  and anything unwatched is waved off once and never shown again. What remains open is the
  payoff: the first dozen entries still produce no number worth showing.
- **Re-comparison.** Insertion never revisits a settled pair, so an early misjudgement is
  permanent and silently skews everything placed after it.

  Repair exists in two forms: dragging a row, which suits a nudge of a place or two, and
  re-placing a film by comparison, which is ~log₂(n) answers and the only sane way to move
  something a hundred places. Both rewrite one key, and any resulting order is valid, so
  neither can contradict anything.

  Repair is now prompted, too: a placement is followed by its two neighbours and a nudge,
  which is the one moment the user can still recognise a bad answer. It sits beside the
  next offer rather than in front of it — a confirmation step on every placement would cost
  more than the errors it catches.

  What remains open is the error this cannot reach. A film placed correctly against
  neighbours that are themselves mis-ordered looks right at every step, and only a
  comparison it was never asked for would reveal it.
- **Matchup difficulty.** Binary insertion converges on the user's uncertainty, so the
  game gets harder the longer it is played. Easy comparisons are satisfying but carry no
  information; some deliberate mixing is likely needed.
- **Weighting scheme.** Down-weighting power users is necessary; the specific function is
  undecided.
