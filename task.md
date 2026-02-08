# Tasks

## 1. Version Restore Content Fix
- [ ] Backend: Update OnlyOffice key generation (high-precision timestamp/UUID)
- [ ] Frontend: Force existing editor to reload/re-initialize after restore success

## 2. Kanban Column Management
- [ ] Model: Add `columns` JSON field to optional `Project` model (requires migration)
- [ ] Migration: Script to add column to SQLite and set defaults
- [ ] Backend: Update `get_project` to return columns
- [ ] Backend: Add `PUT /api/projects/<id>/columns` endpoint
- [ ] Frontend: Update `renderKanban` to use dynamic columns
- [ ] Frontend: Add UI for "Add Column", "Edit Name", "Delete Column"
- [ ] Frontend: Implement proper column filtering for cards

## 3. Card Positioning (Top)
- [ ] Backend: Update `create_card` to calculate `min_position - 1`

## 4. Unread Messages Count
- [ ] Model: Create `UnreadStatus` model (user_id, project_id, last_read_at)
- [ ] Migration: Script to create table
- [ ] Backend: Update `get_projects` to include unread count
- [ ] Backend: Add `POST /api/projects/<id>/read` endpoint
- [ ] Frontend: Show unread badge on project list
- [ ] Frontend: Trigger read status update when entering project

## 5. Deployment
- [ ] Review `deploy.sh` and ensure migration scripts are included
