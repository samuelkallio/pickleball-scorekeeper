// src/App.js
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Pickleball Scorekeeper
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Scoreboard</h2>
        <p className="text-gray-700">Tämä on alustava näkymä.</p>
      </main>

      <footer className="mt-12 py-6 bg-white border-t border-gray-200 text-center text-gray-600">
        <p>Pickleball Scorekeeper &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
