# IMS/MRP System

This project is an Inventory Management System (IMS) and Manufacturing Resource Planning (MRP) system built with Django (Backend) and React (Frontend).

## Overview

The system handles:
- **Inventory Management**: Tracking items, locations, and quantities.
- **Recipes & Production**: Defining recipes and logging production (Prep) to deduct ingredients and add finished goods.
- **Stocktake**: Session-based stock counting with variance analysis.
- **Receiving**: Logging incoming stock to update inventory.
- **Analytics**: Dashboard for low stock, expiration, and usage trends.

## Architecture

- **Backend**: Django REST Framework (DRF).
- **Frontend**: React with Tailwind CSS.
- **Database**: SQLite (Development).

## Key Workflows

### 1. Stocktake (Context 7 Rework)

The Stocktake process has been reworked into a session-based wizard:

1.  **Start Session**: User initiates a stocktake session.
2.  **Count by Location**: User selects a location and enters counts for items.
    *   *Note*: Counts are saved per location.
3.  **Review**: User can see which locations are completed.
4.  **Finalize**:
    *   System calculates **Actual Usage** = (Start Stock + Received - End Count).
    *   System calculates **Theoretical Usage** = Sum(Production Logs * Recipe Usage).
    *   Variance is recorded.
    *   Inventory is updated to match the counted quantities.

### 2. Receiving

New feature to handle incoming stock:
- Users log items received.
- Inventory is automatically incremented in the item's default location (or fallback).
- Logs are preserved for "Actual Usage" calculation.

## Data Models

### Inventory
- `Item`: Global product definition.
- `Location`: Physical storage areas.
- `Inventory`: Quantity of an Item at a Location.
- `ReceivingLog`: Log of incoming items.

### Stocktake
- `StocktakeSession`: Represents a full store count event.
- `StocktakeRecord`: Individual counts for an item at a location within a session.
- `VarianceLog`: Resulting discrepancy after finalization.

### Production
- `Recipe`: Instructions and ingredients for producing an item.
- `ProductionLog`: Record of "Prep" actions, triggering inventory deduction.

## Getting Started

### Backend
```bash
cd backend
source ../venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation Standards
This documentation and the recent refactoring follow best practices as verified by Context 7 (React & Django standards).





