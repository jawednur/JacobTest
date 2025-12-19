# IMS Frontend

This is the React frontend for the Inventory Management System.

## Project Structure

- `src/pages`: Main views
  - `Stocktake.tsx`: Reworked session-based stocktake wizard.
  - `Receiving.tsx`: New receiving log interface.
  - `Dashboard.tsx`: Analytics overview.
  - `Inventory.tsx`: Inventory list and management.
- `src/services`: API integration
  - `api.ts`: Centralized Axios calls to Django backend.
- `src/components`: Reusable UI components.

## New Features (Context 7 Update)

### Stocktake Wizard
The `Stocktake.tsx` page implements a multi-step process:
1.  **Init**: Checks/Starts a `StocktakeSession`.
2.  **Location List**: Shows completion status.
3.  **Counting**: Detailed input for each item in a location.
4.  **Finalization**: Generates a Variance/Usage report.

### Receiving
The `Receiving.tsx` page allows logging incoming goods, which updates inventory quantities and feeds into the "Actual Usage" calculation.

## Development

```bash
npm install
npm run dev
```
