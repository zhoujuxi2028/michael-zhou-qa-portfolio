/**
 * CSV Loader Jest Tests (UT-CSV-01~12)
 * Unit tests for parseCSV: null/undefined handling, empty lines, missing values, trimming
 * validateColumns: required column validation
 */
const { parseCSV, validateColumns } = require('../../../src/utils/csv-loader');

describe('parseCSV Function', () => {
  // UT-CSV-01: Null/undefined content throws error
  describe('UT-CSV-01: Null/undefined content throws error', () => {
    it('should throw error when content is null', () => {
      expect(() => parseCSV(null)).toThrow('CSV content is required (got null/undefined)');
    });

    it('should throw error when content is undefined', () => {
      expect(() => parseCSV(undefined)).toThrow('CSV content is required (got null/undefined)');
    });
  });

  // UT-CSV-02: Empty content returns empty array
  describe('UT-CSV-02: Empty content returns empty array', () => {
    it('should return empty array for empty string', () => {
      const result = parseCSV('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      const result = parseCSV('   \n   \n   ');
      expect(result).toEqual([]);
    });
  });

  // UT-CSV-03: Header-only CSV returns empty array
  describe('UT-CSV-03: Header-only CSV returns empty array', () => {
    it('should return empty array when only header row present', () => {
      const csv = 'id,name,email';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });

    it('should return empty array when header has trailing newline', () => {
      const csv = 'id,name,email\n';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });
  });

  // UT-CSV-04: Valid CSV with single data row
  describe('UT-CSV-04: Valid CSV with single data row', () => {
    it('should parse single data row correctly', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  // UT-CSV-05: Valid CSV with multiple data rows
  describe('UT-CSV-05: Valid CSV with multiple data rows', () => {
    it('should parse multiple data rows correctly', () => {
      const csv = 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com\n3,Bob,bob@example.com';
      const result = parseCSV(csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
      expect(result[2]).toEqual({ id: '3', name: 'Bob', email: 'bob@example.com' });
    });
  });

  // UT-CSV-06: Whitespace trimming in headers and values
  describe('UT-CSV-06: Whitespace trimming in headers and values', () => {
    it('should trim whitespace from headers', () => {
      const csv = ' id , name , email \n1,John,john@example.com';
      const result = parseCSV(csv);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');
    });

    it('should trim whitespace from values', () => {
      const csv = 'id,name,email\n 1 , John , john@example.com ';
      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should preserve whitespace within values (not at edges)', () => {
      const csv = 'id,name,email\n1,John Doe,john doe@example.com';
      const result = parseCSV(csv);

      expect(result[0].name).toBe('John Doe');
      expect(result[0].email).toBe('john doe@example.com');
    });
  });

  // UT-CSV-07: Empty lines are filtered
  describe('UT-CSV-07: Empty lines are filtered', () => {
    it('should skip blank lines between data', () => {
      const csv = 'id,name\n1,John\n\n2,Jane\n\n3,Bob';
      const result = parseCSV(csv);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
      expect(result[2].name).toBe('Bob');
    });

    it('should skip lines with only whitespace', () => {
      const csv = 'id,name\n1,John\n   \n2,Jane';
      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
    });
  });

  // UT-CSV-08: Missing values (fewer columns than headers)
  describe('UT-CSV-08: Missing values (fewer columns than headers)', () => {
    it('should set missing values to empty string', () => {
      const csv = 'id,name,email,phone\n1,John,john@example.com';
      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
        phone: '',
      });
    });

    it('should handle completely empty row values', () => {
      const csv = 'id,name,email\n1,,john@example.com';
      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        id: '1',
        name: '',
        email: 'john@example.com',
      });
    });
  });

  // UT-CSV-09: Extra values (more columns than headers) are ignored
  describe('UT-CSV-09: Extra values (more columns than headers) are ignored', () => {
    it('should ignore extra values beyond header count', () => {
      const csv = 'id,name,email\n1,John,john@example.com,extra1,extra2';
      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
      });
      expect(Object.keys(result[0])).toHaveLength(3);
    });
  });

  // UT-CSV-10: Single column CSV
  describe('UT-CSV-10: Single column CSV', () => {
    it('should parse single column correctly', () => {
      const csv = 'id\n1\n2\n3';
      const result = parseCSV(csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '1' });
      expect(result[1]).toEqual({ id: '2' });
      expect(result[2]).toEqual({ id: '3' });
    });
  });

  // UT-CSV-11: Many columns CSV
  describe('UT-CSV-11: Many columns CSV', () => {
    it('should parse CSV with many columns', () => {
      const csv = 'col1,col2,col3,col4,col5,col6,col7,col8\na,b,c,d,e,f,g,h';
      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(Object.keys(result[0])).toHaveLength(8);
      expect(result[0]).toEqual({
        col1: 'a',
        col2: 'b',
        col3: 'c',
        col4: 'd',
        col5: 'e',
        col6: 'f',
        col7: 'g',
        col8: 'h',
      });
    });
  });

  // UT-CSV-12: Special characters in values
  describe('UT-CSV-12: Special characters in values', () => {
    it('should preserve special characters in values', () => {
      const csv = 'id,name,notes\n1,John@Domain,Note with, comma';
      const result = parseCSV(csv);

      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('John@Domain');
      // Note: commas within values would split incorrectly without quoted fields
      // This is a limitation of simple split-based parsing
    });

    it('should handle numeric and boolean-like strings', () => {
      const csv = 'id,count,active\n1,100,true';
      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        id: '1',
        count: '100',
        active: 'true',
      });
    });
  });
});

describe('validateColumns Function', () => {
  // UT-VAL-01: Valid columns pass validation
  describe('UT-VAL-01: Valid columns pass validation', () => {
    it('should not throw when all required columns present', () => {
      const rows = [{ id: '1', name: 'John', email: 'john@example.com' }];
      expect(() => validateColumns(rows, ['id', 'name'])).not.toThrow();
    });
  });

  // UT-VAL-02: Missing columns throw error
  describe('UT-VAL-02: Missing columns throw error', () => {
    it('should throw error when required column missing', () => {
      const rows = [{ id: '1', name: 'John' }];
      expect(() => validateColumns(rows, ['id', 'name', 'email'])).toThrow(
        'CSV missing required columns: email'
      );
    });

    it('should throw error when multiple columns missing', () => {
      const rows = [{ id: '1' }];
      expect(() => validateColumns(rows, ['id', 'name', 'email', 'phone'])).toThrow(
        'CSV missing required columns: name, email, phone'
      );
    });
  });

  // UT-VAL-03: Empty rows array skips validation
  describe('UT-VAL-03: Empty rows array skips validation', () => {
    it('should not throw error for empty rows', () => {
      expect(() => validateColumns([], ['id', 'name'])).not.toThrow();
    });
  });

  // UT-VAL-04: Case-sensitive column matching
  describe('UT-VAL-04: Case-sensitive column matching', () => {
    it('should be case-sensitive when matching columns', () => {
      const rows = [{ ID: '1', Name: 'John' }];
      expect(() => validateColumns(rows, ['id', 'name'])).toThrow(
        'CSV missing required columns: id, name'
      );
    });
  });

  // UT-VAL-05: Extra columns in row do not cause error
  describe('UT-VAL-05: Extra columns in row do not cause error', () => {
    it('should allow extra columns beyond required ones', () => {
      const rows = [{ id: '1', name: 'John', email: 'john@example.com', extra: 'data' }];
      expect(() => validateColumns(rows, ['id', 'name'])).not.toThrow();
    });
  });
});

describe('Integration: parseCSV + validateColumns', () => {
  // UT-INT-01: Complete workflow
  describe('UT-INT-01: Complete workflow', () => {
    it('should parse CSV and validate all required columns present', () => {
      const csv = 'id,name,email,phone\n1,John,john@example.com,555-1234\n2,Jane,jane@example.com,555-5678';
      const rows = parseCSV(csv);

      expect(() => validateColumns(rows, ['id', 'name', 'email'])).not.toThrow();
      expect(rows).toHaveLength(2);
    });

    it('should parse CSV and fail validation on missing column', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const rows = parseCSV(csv);

      expect(() => validateColumns(rows, ['id', 'name', 'email', 'phone'])).toThrow(
        'CSV missing required columns: phone'
      );
    });
  });
});
