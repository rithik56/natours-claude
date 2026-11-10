# 0014. One price per tour

Status: Accepted
Date: 9 Nov 2026
Requirements: B20
Plan review: QA-05

## Context

`plan.md` 1.3 gives the Tour model a `priceDiscount` field: whole rupees, less than `price`. The plan does not say what it means or what a customer pays (QA-05):

- whether it is the amount taken off or the sale price;
- whether checkout charges `price` or `price − priceDiscount`;
- whether the "from" price, the price filter, the price sort and the booking snapshot use the discounted figure.

Each answer changes what a traveller sees against what they are charged, and money is where a mismatch costs the most. None of the 13 tours in `seed/data/tours.json` has a discount, and no requirement asks for one.

## Decision

- `priceDiscount` is removed from the Tour model in v2. This deviates from `plan.md` 1.3, which stays unedited (ADR 0003).
- A tour has one price, in whole rupees (B20). That one figure is shown on cards and detail pages, used by the price filter and the price sort, copied onto the booking as its snapshot, and charged at checkout.
- No seed tour has a discount, so the seed data needs no change.

## Consequences

- There is one number to check at every step from catalogue to receipt, so the amount a traveller sees is the amount they pay.
- Phase 4 filters and sorts on `price` alone, and Phase 6 checkout charges `price` converted with `rupeesToPaise`.
- If discounts return as their own feature, the change must first define, in a new ADR:
  - what the discount value means: an amount off the sale price or a sale price;
  - what checkout charges and what the booking snapshots;
  - which figure filters, sorts and "from" prices use.
- Indexes follow the model: `{ price: 1, ratingsAverage: -1 }` carries no discount field.
