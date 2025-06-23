import { useState } from 'react';

const SearchAndFilter = ({ onSearchChange, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const guardOptions = [
    'Standing',
    'Passing',
    'Sparring',
    'Closed Guard',
    'Open Guard',
    'Half Guard',
    'Butterfly Guard',
    'De La Riva Guard',
    'X Guard',
    'Spider Guard',
    'Lasso Guard',
    'Rubber Guard',
    '50/50 Guard',
    'Worm Guard',
    'Z Guard',
    'Knee Shield Guard',
    'Williams Guard',
    'Reverse De La Riva',
    'Full Mount',
    'Side Control',
    'North-South',
    'Back Mount',
    'Turtle',
    'Knee on Belly',
    'Scarf Hold (Kesa Gatame)',
    'Modified Scarf Hold',
    'Crucifix',
    'Truck',
    'Electric Chair',
    'Ashii Garami',
    'Saddle (Inside Sankaku)',
    'Outside Ashii',
    'Single Leg X',
    'Sparring',
  ];

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    onSearchChange(e.target.value);
  };

  const handlePositionChange = (e) => {
    setSelectedPosition(e.target.value);
    onFilterChange(e.target.value);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <input
        type="text"
        placeholder="Search by title, person, or position..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="flex-grow border border-white text-white placeholder-gray-400 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
      />
      <select
        value={selectedPosition}
        onChange={handlePositionChange}
        className="border border-white bg-black text-white p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
      >
        <option value="">All Positions</option>
        {guardOptions.map((pos) => (
          <option key={pos} value={pos}>
            {pos}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchAndFilter;
