# Online Classroom Application

A modern, feature-rich online classroom platform for teachers and students.

## Features

### For Teachers
- Create and manage online classes
- Upload learning materials (PDF, videos, audio, images, documents)
- Share screen during live sessions
- Real-time chat with students
- Manage student registrations

### For Students
- Browse and register for classes
- View and download learning materials
- Upload assignments and homework
- Real-time communication with teachers
- Live video classroom participation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd classroom-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

### Login
1. Choose an avatar
2. Enter your name
3. Select your role (Teacher or Student)

### For Teachers

1. **Create a Class**
   - Go to Dashboard
   - Click "Create New Class"
   - Fill in the title, description, date, and time

2. **Manage Materials**
   - Go to Materials tab
   - Select your class
   - Upload PDFs, videos, audio, images, or documents

3. **Start a Live Class**
   - Go to Dashboard
   - Click "Enter Classroom" on your class card

4. **During Live Session**
   - Use camera and microphone controls
   - Share your screen
   - Access materials sidebar
   - Chat with students

### For Students

1. **Register for Classes**
   - Browse classes on Dashboard
   - Click "Register for Class"

2. **Access Materials**
   - Go to Materials tab
   - Select your class
   - View and download learning materials

3. **Submit Work**
   - Go to My Submissions tab
   - Select your class
   - Upload your homework, projects, or assignments

4. **Join Live Class**
   - Go to Dashboard
   - Click "Enter Classroom" on a registered class

## File Types Supported

- **Documents**: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT
- **Videos**: MP4, WEBM, MOV
- **Audio**: MP3, WAV
- **Images**: JPG, JPEG, PNG, GIF

## Technical Details

- Built with React 18
- Modern CSS with gradients and animations
- Local storage for data persistence
- WebRTC for video/audio (camera access)
- Screen sharing using MediaDevices API

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Permissions Required

- Camera access
- Microphone access
- Screen sharing (when used)

## Notes

- All data is stored locally in your browser (localStorage)
- For production use, consider integrating a backend database
- Video functionality requires HTTPS in production environments
