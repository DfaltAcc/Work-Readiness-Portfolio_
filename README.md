# Work Readiness Portfolio

A modern, interactive digital portfolio showcasing professional development and work readiness training with persistent file storage capabilities.

![Portfolio Preview](public/placeholder.jpg)

## 🌟 Features

### 📁 Persistent File Storage
- **Permanent Storage**: Files are saved locally using IndexedDB and persist across browser sessions
- **Multi-Format Support**: Upload documents (PDF, DOC, DOCX, TXT) and images (JPG, PNG, GIF, WEBP)
- **Video Support**: Store and play videos (MP4, MOV, AVI, WEBM, MKV) up to 150MB
- **Automatic Fallback**: Falls back to localStorage or memory storage if IndexedDB is unavailable
- **File Compression**: Automatic compression for optimal storage usage

### 🖼️ Media Preview
- **Image Gallery**: View uploaded images directly in the portfolio with full-size previews
- **Video Player**: Built-in video player with full controls (play, pause, volume, fullscreen)
- **Show/Hide Toggle**: Expand or collapse media previews with a single click
- **Responsive Design**: Media adapts to all screen sizes

### 📊 Storage Management
- **Real-time Usage Tracking**: Monitor storage usage with visual indicators
- **Storage Quota Warnings**: Get notified when approaching storage limits
- **File Management**: Download or delete files with confirmation dialogs
- **Metadata Display**: View file size, upload date, and compression status

### 🎨 Portfolio Sections
- **Business Communication**: Professional communication skills and technical documentation
- **Interview Skills**: Interview preparation and confidence building
- **Mock Interview**: Professional assessment and feedback
- **Professional Networking**: AWS Community Events & Capaciti networking success
- **Workplace Etiquette**: Professional development at Plum Systems

### 🔒 Privacy & Security
- **Local Storage Only**: All files remain on your device
- **No External Uploads**: Files are never sent to external servers
- **Browser-Based**: Works entirely in your browser
- **Data Integrity**: Checksum validation ensures file integrity

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DfaltAcc/Work-Readiness-Portfolio_.git
cd Work-Readiness-Portfolio_
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📦 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Storage**: IndexedDB with fallbacks
- **Icons**: Lucide React
- **Testing**: Jest & React Testing Library

## 🗂️ Project Structure

```
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Main portfolio page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── portfolio-section.tsx   # Portfolio section with file display
│   ├── document-upload.tsx     # Document upload component
│   ├── video-upload.tsx        # Video upload component
│   └── storage-*.tsx           # Storage management components
├── lib/                     # Utility libraries
│   └── storage/            # File storage system
│       ├── file-storage-context.tsx    # React context for storage
│       ├── file-storage-service.ts     # Main storage service
│       ├── indexeddb-storage.ts        # IndexedDB implementation
│       ├── indexeddb-wrapper.ts        # IndexedDB wrapper
│       ├── file-processor.ts           # File processing & validation
│       └── types.ts                    # TypeScript types
├── public/                  # Static assets
└── README.md               # This file
```

## 💾 Storage System

### Architecture

The storage system uses a layered approach with automatic fallback:

1. **Primary**: IndexedDB (unlimited storage, persistent)
2. **Secondary**: localStorage (5-10MB, persistent)
3. **Fallback**: Memory storage (session-only)

### Storage Flow

```
User Upload → File Validation → Compression (if needed) → IndexedDB Storage → Success
                                                              ↓ (if fails)
                                                         localStorage Storage
                                                              ↓ (if fails)
                                                         Memory Storage
```

### File Processing

- **Validation**: File type and size validation before storage
- **Compression**: Automatic compression for files over threshold
- **Checksum**: SHA-256 checksum for integrity validation
- **Metadata**: Stores file name, size, type, category, and timestamps

## 🎯 Usage

### Uploading Files

1. Navigate to any portfolio section
2. Click on the upload area or drag and drop files
3. Files are automatically validated and stored
4. See confirmation message and file appears in "Saved Evidence Files"

### Viewing Media

1. Locate the "Saved Evidence Files" section
2. Click "Show" button next to any image or video
3. Media displays inline with full controls
4. Click "Hide" to collapse the preview

### Managing Files

- **Download**: Click the download icon to save file to your device
- **Delete**: Click the trash icon to remove file (with confirmation)
- **View Details**: See file size, upload date, and compression status

## 🧪 Testing

Run the test suite:

```bash
npm test
# or
pnpm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

## 🔧 Configuration

### Storage Limits

Default storage limits can be configured in `lib/storage/file-storage-service.ts`:

```typescript
private readonly MAX_FILE_SIZE = {
  document: 10 * 1024 * 1024,  // 10MB
  video: 150 * 1024 * 1024     // 150MB
}
```

### Accepted File Formats

Configure accepted formats in upload components:

```typescript
// Documents
acceptedFormats={['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'webp']}

// Videos
acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
```

## 🌐 Deployment

### GitHub Pages

This project is configured for GitHub Pages deployment:

1. Push to main branch
2. GitHub Actions automatically builds and deploys
3. Site available at: `https://[username].github.io/[repo-name]`

### Vercel

Deploy with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DfaltAcc/Work-Readiness-Portfolio_)

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## 📝 Portfolio Content

### Business Communication
Real-world technical communication experience at Plum Systems, working on Issue #459 - a high-priority bug affecting mobile app and web portal synchronization.

### Interview Skills
Transformation from interview anxiety to confidence through SHL platform training, achieving 60% callback rate improvement.

### Mock Interview
Comprehensive 50-minute mock interview with Microsoft recruiter Sarah Chen, including behavioral and technical assessments.

### Professional Networking
AWS Community Events & Capaciti networking success, growing LinkedIn from 12 to 61 connections with direct job referral.

### Workplace Etiquette
10 months of professional development at Plum Systems, evolving from early mistakes to trusted team member.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Hlumelo Madlingozi**

- LinkedIn: [linkedin.com/in/hlumelo-madlingozi-97a889234](https://linkedin.com/in/hlumelo-madlingozi-97a889234)
- GitHub: [@DfaltAcc](https://github.com/DfaltAcc)

## 🙏 Acknowledgments

- Plum Systems for the professional development opportunity
- Capaciti for training programs and networking events
- AWS Community for technical workshops and meetups
- All mentors and colleagues who contributed to this journey

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact via LinkedIn

---

**Built with ❤️ using Next.js and TypeScript**
