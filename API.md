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

Alternatively, you can use a simple Node.js script to upload research items:

```javascript
const fetch = require("node-fetch");

async function addResearch(data) {
  const response = await fetch("https://your-site.com/api/links", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_KEY,
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

// Example usage
addResearch({
  slug: "machine-learning-study",
  target: "https://github.com/your-username/machine-learning-study",
  title: "Machine Learning Study",
  description: "Analysis of ML algorithms for natural language processing",
  tags: ["machine-learning", "nlp", "python"],
})
  .then(console.log)
  .catch(console.error);
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

## Tag Management

You can rename tags across all entries using the tags API endpoint. This is useful for standardizing tag names or fixing typos.

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

## Admin Panel

The admin panel is accessible at [https://your-site.com/admin](https://your-site.com/admin). It allows you to add, update, and delete research projects. The admin panel is only accessible if the `ADMIN_KEY` environment variable is set.
