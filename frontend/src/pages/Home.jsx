import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to PDFXplor</h1>
      <Link to="/viewer" className="bg-blue-500 text-white px-4 py-2 rounded">
        Go to PDF Viewer
      </Link>
    </div>
  );
}
