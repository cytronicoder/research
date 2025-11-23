# API Documentation

This document covers the API endpoints available for managing research projects, ORCID entries, and tags in your research site.

## Authentication

All API endpoints require authentication using the `ADMIN_KEY` environment variable. Include this in the `x-admin-key` header for all requests.

## Authentication API

### Check Authentication Status

Verify if your admin key is valid:

```bash
curl "https://your-site.com/api/auth" \
  -H "x-admin-key: your-admin-key"
```

**Response:**

```json
{
  "authenticated": true
}
```

Returns `401 Unauthorized` if the key is invalid.

## Research Projects API

### Adding/Updating Research Projects

To upload a new research project, use the `/api/links` endpoint with a POST request. You can add either a single project or multiple projects at once.

#### Single Project

```bash
curl -X POST https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slug": "project-name",
    "target": "https://link-to-research.com",
    "title": "My Research Project",
    "description": "Brief description of the research",
    "tags": ["tag1", "tag2", "tag3"]
  }'
```

#### Multiple Projects

```bash
curl -X POST https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "links": [
      {
        "slug": "project-1",
        "target": "https://example.com/project1",
        "title": "Project 1",
        "description": "Description 1",
        "tags": ["tag1", "tag2"]
      },
      {
        "slug": "project-2",
        "target": "https://example.com/project2",
        "title": "Project 2",
        "description": "Description 2",
        "tags": ["tag2", "tag3"]
      }
    ]
  }'
```

To update research projects, use the `/api/links` endpoint with a PUT request. You can update a single project or multiple projects.

#### Single Project Update

```bash
curl -X PUT https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slug": "project-name",
    "description": "New description of the research"
  }'
```

#### Multiple Projects Update

```bash
curl -X PUT https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "links": [
      { "slug": "project-1", "description": "Updated desc 1" },
      { "slug": "project-2", "description": "Updated desc 2" }
    ]
  }'
```

**Parameters:**

- `slug`: Unique identifier for the project (required for updates)
- `target`: URL to the research project (required for new projects)
- `title`: Project title
- `description`: Brief description
- `tags`: Array of tag strings
- `permanent`: Boolean flag for permanent links (optional)

### Bulk Operations

#### Bulk Updates

To update multiple projects at once:

```bash
# Update specific projects
curl -X PATCH https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slugs": ["project-1", "project-2"],
    "updates": {
      "tags": ["updated-tag"],
      "description": "Updated description for all"
    }
  }'

# Update all projects with a specific tag
curl -X PATCH https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "tag": "old-tag",
    "updates": {
      "permanent": true
    }
  }'
```

#### Bulk Deletion

To delete multiple projects:

```bash
curl -X DELETE "https://your-site.com/api/links?slugs=project-1,project-2,project-3" \
  -H "x-admin-key: your-admin-key"
```

### Querying Projects

#### Get All Projects with Filtering

```bash
# Get all projects
curl "https://your-site.com/api/links" \
  -H "x-admin-key: your-admin-key"

# Filter by tag
curl "https://your-site.com/api/links?tag=machine-learning" \
  -H "x-admin-key: your-admin-key"

# Filter by source
curl "https://your-site.com/api/links?source=orcid" \
  -H "x-admin-key: your-admin-key"

# Search across title, description, and tags
curl "https://your-site.com/api/links?search=neural" \
  -H "x-admin-key: your-admin-key"

# Pagination
curl "https://your-site.com/api/links?limit=10&offset=20" \
  -H "x-admin-key: your-admin-key"
```

**Query Parameters:**

- `tag`: Filter by specific tag
- `source`: Filter by source (`manual` or `orcid`)
- `search`: Search in title, description, and tags
- `limit`: Maximum number of results (default: 100, max: 200)
- `offset`: Pagination offset (default: 0)

#### Get Specific Project

```bash
curl "https://your-site.com/api/links?slug=project-name" \
  -H "x-admin-key: your-admin-key"
```

### Deleting Projects

You can delete projects by slug, multiple slugs, or by tag.

```bash
# Delete single project
curl -X DELETE "https://your-site.com/api/links?slug=project-name" \
  -H "x-admin-key: your-admin-key"

# Delete multiple projects
curl -X DELETE "https://your-site.com/api/links?slugs=project-1,project-2" \
  -H "x-admin-key: your-admin-key"

# Delete by tag (deletes all projects with this tag)
curl -X DELETE "https://your-site.com/api/links?tag=old-tag" \
  -H "x-admin-key: your-admin-key"
```

You can also use the request body for deletion:

```bash
curl -X DELETE https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slugs": ["project-1", "project-2"],
    "tag": "deprecated"
  }'
```

## Collections API

Collections let you group related projects together and expose collection-level metadata (tags). Collections are stored server-side and returned by the app to render grouped project widgets. The UI maintains per-browser collapsed state locally.

### Get all collections

```bash
curl "https://your-site.com/api/collections" \
  -H "x-admin-key: your-admin-key"
```

**Response fields** include `id`, `name`, `description`, `projects` (array of project slugs), `tags` (array), `createdAt`, and `updatedAt`.

### Create a collection (POST)

```bash
curl -X POST https://your-site.com/api/collections \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "id": "my-collection",
    "name": "My Collection",
    "description": "High-level grouping",
    "projects": ["project-1", "project-2"],
    "tags": ["featured", "2025"],
  }'
```

### Update a collection (PUT)

Supports partial updates — send only the fields you want to change (requires `id`).

```bash
curl -X PUT https://your-site.com/api/collections \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "id": "my-collection",
    "name": "Updated collection name",
    "tags": ["featured","updated"],
  }'
```

### Delete a collection

```bash
curl -X DELETE "https://your-site.com/api/collections?id=my-collection" \
  -H "x-admin-key: your-admin-key"
```

## Directory API

### Get All Projects (Public)

Get a public directory of all projects without requiring authentication:

```bash
curl "https://your-site.com/api/directory"
```

**Response:**

```json
[
  {
    "slug": "project-name",
    "target": "https://example.com/project",
    "clicks": 42,
    "shortUrl": "/project-name",
    "title": "Project Title",
    "description": "Project description",
    "tags": ["tag1", "tag2"],
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

This endpoint returns all projects sorted by creation date (newest first).

## ORCID Integration

### Updating ORCID Entries

If you've configured ORCID integration, you can customize the tags and metadata for your ORCID publications. ORCID entries are automatically stored in your database when first fetched, allowing you to update them just like manual entries.

To update an ORCID entry with custom tags:

```bash
curl -X PUT https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slug": "orcid-12345",
    "target": "https://doi.org/10.1234/example",
    "title": "Custom Title for ORCID Work",
    "description": "Custom description",
    "tags": ["machine-learning", "neural-networks", "python"]
  }'
```

The slug for ORCID entries follows the pattern `orcid-{put-code}`, where `put-code` is the unique identifier from ORCID.

## Tag Management

### Get Tag Statistics

Get comprehensive statistics about tags:

```bash
curl "https://your-site.com/api/tags?action=stats" \
  -H "x-admin-key: your-admin-key"
```

Returns tag counts, source distribution, and top tags.

### Get Tag Suggestions

Get tag suggestions based on partial input:

```bash
curl "https://your-site.com/api/tags?action=suggest&prefix=mach" \
  -H "x-admin-key: your-admin-key"
```

Returns up to 10 tag suggestions that start with the given prefix.

### Renaming Tags

To rename a tag:

```bash
curl -X PUT https://your-site.com/api/tags \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "oldTag": "machine learning",
    "newTag": "machine-learning"
  }'
```

This will update all entries that have the old tag to use the new tag name.

### Adding Tags to Multiple Entries

To add one or more tags to multiple entries at once:

```bash
curl -X POST https://your-site.com/api/tags \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slugs": ["project-1", "project-2", "project-3"],
    "tags": ["new-tag", "another-tag"]
  }'
```

This will add the specified tags to all the entries with the given slugs. Duplicates are automatically removed.

### Removing Tags from Multiple Entries

To remove one or more tags from multiple entries at once:

```bash
curl -X PATCH https://your-site.com/api/tags \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slugs": ["project-1", "project-2", "project-3"],
    "tags": ["old-tag", "unwanted-tag"]
  }'
```

This will remove the specified tags from all the entries with the given slugs.

### Removing Tags

To remove a tag from all entries:

```bash
curl -X DELETE https://your-site.com/api/tags \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "tag": "old-tag-name"
  }'
```

This will remove the specified tag from all entries that contain it.

## Analytics API

Get comprehensive analytics about your research site:

```bash
# All-time statistics
curl "https://your-site.com/api/stats" \
  -H "x-admin-key: your-admin-key"

# Statistics for specific period
curl "https://your-site.com/api/stats?period=week" \
  -H "x-admin-key: your-admin-key"
```

**Available periods:** `all`, `week`, `month`, `year`

Returns total links, clicks, source distribution, top performers, recent activity, and more.

## Search API

Advanced search across all entries:

```bash
# Search by query
curl "https://your-site.com/api/search?q=neural" \
  -H "x-admin-key: your-admin-key"

# Search with filters
curl "https://your-site.com/api/search?q=machine&tag=python&source=manual" \
  -H "x-admin-key: your-admin-key"

# Paginated search
curl "https://your-site.com/api/search?q=research&limit=5&offset=10" \
  -H "x-admin-key: your-admin-key"
```

**Query Parameters:**

- `q`: Search query (required if no other filters)
- `tag`: Filter by specific tag
- `source`: Filter by source (`manual` or `orcid`)
- `limit`: Maximum results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

Returns ranked results with relevance scores and highlights.

## Export API

Export all your data for backup or migration:

```bash
# Export as JSON
curl "https://your-site.com/api/export" \
  -H "x-admin-key: your-admin-key"

# Export as CSV
curl "https://your-site.com/api/export?format=csv" \
  -H "x-admin-key: your-admin-key"

# Export specific source
curl "https://your-site.com/api/export?source=orcid" \
  -H "x-admin-key: your-admin-key"
```

**Formats:** `json`, `csv`
**Source filters:** `manual`, `orcid`

## Admin Panel

The admin panel is accessible at [https://your-site.com/admin](https://your-site.com/admin). It allows you to add, update, and delete research projects. The admin panel is only accessible if the `ADMIN_KEY` environment variable is set.
