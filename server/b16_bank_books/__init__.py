"""B16 · the books checked against the bank, on Nessie (docs/plans/B16-bank-books.md).

- `books.py`: the operating account's Nessie records as `BankTxn`s, and B01's matcher over them.
- `accounts.py`: the co-op's customer through B04's account, B16's two accounts, the posts with
  read-back, and the status cache.

The routes live in `server/routers/b16_bank_books.py`.
"""
