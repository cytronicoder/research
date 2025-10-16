Hey! This is a searchable repository for my research projects built with Next.js, Redis, and React. However, you can also use it as a template for your own research site.

This app allows you to organize research projects with tags, descriptions, and links, making them easily discoverable through a clean search interface.

### Features

- Real-time search across project titles, descriptions, and tags
- Redis-powered data storage for efficient retrieval
- Light/dark mode support
- Fast server-side rendering with Next.js
- Responsive design for all devices
- URL shortening for research links
- ORCID integration for automatic publication fetching
- OpenReview integration for conference submissions

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
   OPENREVIEW_USER_ID=your-openreview-profile-id
   ```

   For my project, I am taking advantage of [Vercel's Redis integration](https://vercel.com/integrations/redis). It's pretty straightforward to [set up](https://redis.io/docs/latest/operate/rc/cloud-integrations/vercel/).

   This project also allows you to optionally link your [ORCID](https://orcid.org/) profile by providing your ORCID ID. This will display your ORCID information on the homepage.

   Additionally, you can integrate with [OpenReview](https://openreview.net/) by providing your OpenReview user ID (usually your email or tilde ID like `~First_Last1`). This will automatically fetch and display your conference submissions from OpenReview-powered conferences.

Now, start the development server:

```bash
npm run dev
# or yarn dev, pnpm dev, bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view your research site.

For API documentation and examples on how to add, update, and manage research projects, see [API.md](API.md).

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
