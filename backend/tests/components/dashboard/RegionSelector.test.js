const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const RegionSelector = require('../../../src/components/dashboard/RegionSelector');

describe('RegionSelector Component', () => {
  const mockRegions = [
    { id: 1, name: 'Northeast' },
    { id: 2, name: 'Midwest' },
    { id: 3, name: 'Western' }
  ];

  it('should render all regions in dropdown', () => {
    const mockOnChange = jest.fn();
    render(
      <RegionSelector
        regions={mockRegions}
        selectedRegion={1}
        onRegionChange={mockOnChange}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Northeast')).toBeInTheDocument();
    expect(screen.getByText('Midwest')).toBeInTheDocument();
    expect(screen.getByText('Western')).toBeInTheDocument();
  });

  it('should call onRegionChange when selection changes', () => {
    const mockOnChange = jest.fn();
    render(
      <RegionSelector
        regions={mockRegions}
        selectedRegion={1}
        onRegionChange={mockOnChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });

    expect(mockOnChange).toHaveBeenCalledWith(2);
  });

  it('should display selected region', () => {
    const mockOnChange = jest.fn();
    render(
      <RegionSelector
        regions={mockRegions}
        selectedRegion={2}
        onRegionChange={mockOnChange}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select.value).toBe('2');
  });
});