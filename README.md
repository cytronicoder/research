Hey! This is a searchable repository for my research projects built with Next.js, Redis, and React. However, you can also use it as a template for your own research site.

This app allows you to organize research projects with tags, descriptions, and links, making them easily discoverable through a clean search interface.

### Features

- Real-time search across project titles, descriptions, and tags
- Redis-powered data storage for efficient retrieval
- Light/dark mode support
- Fast server-side rendering with Next.js
- Responsive design for all devices
- URL shortening for research links

### Setting Up

You will need the following to boot up:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Redis](https://redis.io/) instance (local or cloud-based)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [bun](https://bun.sh/) package manager

To install and run your own instance:

1. Fork this repository
2. Clone your forked repository:

   ```bash
   git clone https://github.com/cytronicoder/research.git
   cd research-site
   ```

3. Install dependencies:

   ```bash
   npm install
   # or yarn, pnpm, bun
   ```

4. Create a `.env.local` file with the following variables:

   ```env
   RESEARCH_REDIS_URL=your-redis-connection-string
   ADMIN_KEY=your-secure-admin-key
   ORCID_ID=your-orcid-id
   ```

   For my project, I am taking advantage of [Vercel's Redis integration](https://vercel.com/integrations/redis). It's pretty straightforward to [set up](https://redis.io/docs/latest/operate/rc/cloud-integrations/vercel/).

   This project also allows you to optionally link your [ORCID](https://orcid.org/) profile by providing your ORCID ID. This will display your ORCID information on the homepage.

Now, start the development server:

```bash
npm run dev
# or yarn dev, pnpm dev, bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view your research site.

To upload research projects, you will need to use the API endpoint with the following methods:

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

### Admin Panel

The admin panel is accessible at [https://your-site.com/admin](https://your-site.com/admin). It allows you to add, update, and delete research projects. The admin panel is only accessible if the `ADMIN_KEY` environment variable is set.

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

### Tag Management

You can rename tags across all entries using the tags API endpoint. This is useful for standardizing tag names or fixing typos.

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

### Next Steps

You can customize the site further by:

1. Modifying the colors and styling in `src/app/globals.css`
2. Updating site metadata in `src/app/layout.tsx`
3. Customizing the components in `src/components/` folder

I am currently working on a form UI for submitting research without using the API directly!

### Deployment

The recommended way to deploy your Research Site is with [Vercel](https://vercel.com):

1. Push your repository to GitHub
2. Import your repository in Vercel
3. Add your environment variables (RESEARCH_REDIS_URL and ADMIN_KEY)
4. Deploy

You can also deploy to other platforms that support Next.js applications.
