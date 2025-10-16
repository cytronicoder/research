# API Documentation

This document covers the API endpoints available for managing research projects, ORCID entries, and tags in your research site.

## Authentication

All API endpoints require authentication using the `ADMIN_KEY` environment variable. Include this in the `x-admin-key` header for all requests.

## Research Projects API

### Adding/Updating Research Projects

To upload or update research projects, use the `/api/links` endpoint with a PUT request:

```bash
curl -X PUT https://your-site.com/api/links \
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

**Parameters:**

- `slug`: Unique identifier for the project
- `target`: URL to the research project
- `title`: Project title
- `description`: Brief description
- `tags`: Array of tag strings

### Bulk Operations

#### Adding Multiple Projects

To add multiple projects at once:

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

#### Bulk Updates

To update multiple projects at once:

```bash
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

#### Get Specific Project

```bash
curl "https://your-site.com/api/links?slug=project-name" \
  -H "x-admin-key: your-admin-key"
```

### Deleting Projects

```bash
curl -X DELETE "https://your-site.com/api/links?slug=project-name" \
  -H "x-admin-key: your-admin-key"
```

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

## OpenReview Integration

### Automatic Conference Submission Fetching

If you've configured OpenReview integration by setting the `OPENREVIEW_USER_ID` environment variable, your conference submissions from OpenReview will be automatically fetched and displayed alongside your manual entries and ORCID publications.

The integration fetches submissions where you are listed as an author from conferences that use the OpenReview platform (such as ICLR, NeurIPS, ICML, and many others).

### Updating OpenReview Entries

OpenReview entries are automatically stored in your database when first fetched, allowing you to customize them just like manual entries. To update an OpenReview entry with custom tags or metadata:

```bash
curl -X PUT https://your-site.com/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "slug": "openreview-ABC123",
    "target": "https://openreview.net/forum?id=ABC123",
    "title": "Custom Title for OpenReview Submission",
    "description": "Custom description of the work",
    "tags": ["conference-paper", "machine-learning", "neural-networks"]
  }'
```

The slug for OpenReview entries follows the pattern `openreview-{note-id}`, where `note-id` is the unique identifier from OpenReview.

### Configuration

To enable OpenReview integration, set the `OPENREVIEW_USER_ID` environment variable to your OpenReview profile ID (usually your email address or tilde ID like `~First_Last1`).

#### Authentication for Private Submissions

If you want to access your private or in-review OpenReview submissions, you need to authenticate by setting these additional environment variables:

```env
OPENREVIEW_USERNAME=your-email@example.com
OPENREVIEW_PASSWORD=your-password
```

Without authentication, only publicly visible submissions will be fetched. With authentication, you'll be able to see:

- Papers currently under review
- Private submissions
- Papers in venues where you have author permissions
- All public submissions

**Security Note:** These credentials are only used server-side during build time and are never exposed to the client.

## Tag Management

You can manage tags across entries using the tags API endpoint. This includes renaming tags, removing tags, and bulk operations for adding/removing tags from multiple entries.

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

### Tag Statistics

Get comprehensive statistics about tags:

```bash
curl "https://your-site.com/api/tags?action=stats" \
  -H "x-admin-key: your-admin-key"
```

Returns tag counts, source distribution, and top tags.

### Tag Suggestions

Get tag suggestions based on partial input:

```bash
curl "https://your-site.com/api/tags?action=suggest&prefix=mach" \
  -H "x-admin-key: your-admin-key"
```

Returns up to 10 tag suggestions that start with the given prefix.

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

## Admin Panel

The admin panel is accessible at [https://your-site.com/admin](https://your-site.com/admin). It allows you to add, update, and delete research projects. The admin panel is only accessible if the `ADMIN_KEY` environment variable is set.
