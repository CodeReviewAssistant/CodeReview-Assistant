# Chat UI with Model API Integration

A React-based chat interface for interacting with AI models through an API, built with Vite.

## Features

- Modern UI similar to popular chat applications
- Folder organization for chats
- Real-time message exchange with AI models
- Code highlighting for code snippets
- Support for multiple media types
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chat-ui-react.git
cd chat-ui-react
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Create a `.env` file in the root directory:
```
VITE_API_URL=https://api.yourdomain.com/v1
VITE_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## API Integration

This application connects to a model API. You'll need to update the API endpoints and authentication in the `services/api.js` file to match your specific model API requirements.

## Project Structure

```
chat-ui-react/
├── public/
├── src/
│   ├── components/
│   │   ├── BotAvatar.jsx
│   │   ├── ChatIcon.jsx
│   │   ├── FolderIcon.jsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useChat.js
│   │   └── useTheme.js
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── .env
├── .gitignore
├── package.json
└── vite.config.js
```

## Customization

### Themes

You can customize the color scheme by modifying the CSS variables in `App.css`:

```css
:root {
  --primary-color: #10a37f;
  --text-color: #ffffff;
  --background-dark: #202123;
  --background-light: #343541;
  /* ... other variables ... */
}
```

### API Configuration

Update the API configuration in `services/api.js` to connect to your specific model API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.