import { parseOrg, _parsePlanningItems, parseMarkupAndCookies } from '../../lib/parse_org';
import exportOrg from '../../lib/export_org';
import readFixture from '../../../test_helpers/index';
import { noLogRepeatEnabledP } from '../../reducers/org';

/**
 * This is a convenience wrapper around parsing an org file using
 * `parseOrg` and then export it using `exportOrg`.
 * @param {String} testOrgFile - contents of an org file
 */
function parseAndExportOrgFile(testOrgFile) {
  const parsedFile = parseOrg(testOrgFile);
  const headers = parsedFile.get('headers');
  const todoKeywordSets = parsedFile.get('todoKeywordSets');
  const fileConfigLines = parsedFile.get('fileConfigLines');
  const linesBeforeHeadings = parsedFile.get('linesBeforeHeadings');
  const exportedFile = exportOrg(headers, todoKeywordSets, fileConfigLines, linesBeforeHeadings);
  return exportedFile;
}

describe('Unit Tests for Org file', () => {
  describe('Parsing', () => {
    test("Parsing and exporting shouldn't alter the original file", () => {
      const testOrgFile = readFixture('indented_list');
      const exportedFile = parseAndExportOrgFile(testOrgFile);

      // Should have the same amount of lines. Safeguard for the next
      // expectation.
      const exportedFileLines = exportedFile.split('\n');
      const testOrgFileLines = testOrgFile.split('\n');
      expect(exportedFileLines.length).toEqual(testOrgFileLines.length);

      exportedFileLines.forEach((line, index) => {
        expect(line).toEqual(testOrgFileLines[index]);
      });
    });

    test('Parses and exports a file which contains all features of organice', () => {
      const testOrgFile = readFixture('all_the_features');
      const exportedFile = parseAndExportOrgFile(testOrgFile);
      expect(exportedFile).toEqual(testOrgFile);
    });

    describe('Boldness', () => {
      test('Parsing lines with bold text', () => {
        const testOrgFile = readFixture('bold_text');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });

    describe('Parsing inline-markup', () => {
      test('Parses inline-markup where closing delim is followed by ;', () => {
        const result = parseMarkupAndCookies('*bold*;');
        expect(result.length).toEqual(2);
      });
    });

    describe('regex collisions of inline-markup and different links', () => {
      test('Parse /italic/ followed by URL with /', () => {
        const result = parseMarkupAndCookies('/italic/ word http://example.com/ text');
        expect(result.length).toEqual(4);
      });
      test('Parse =verb= followed by URL with = in query', () => {
        const result = parseMarkupAndCookies('=URL=: http://example.com/?a=b');
        expect(result.length).toEqual(3);
      });
    });

    describe('HTTP URLs', () => {
      test('Parse a line containing an URL but no /italic/ text before the URL', () => {
        const testOrgFile = readFixture('url');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });

    describe('E-mail address', () => {
      test('Parse a line containing an e-mail address', () => {
        const testOrgFile = readFixture('email');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });

    describe('Phone number in canonical format (+xxxxxx)', () => {
      test('Parse a line containing a phone number but no +striked+ text after the number', () => {
        const testOrgFile = readFixture('phonenumber');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });

    describe('Newlines', () => {
      test('Newlines in between headers and items are preserved', () => {
        const testOrgFile = readFixture('newlines');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });

    test('Config and content lines before first heading line are kept', () => {
      const testOrgFile = readFixture('before-first-headline');
      const exportedFile = parseAndExportOrgFile(testOrgFile);
      expect(exportedFile).toEqual(testOrgFile);
    });

    describe('Planning items', () => {
      describe('Formatting is the same as in Emacs', () => {
        describe('List formatting', () => {
          test('Parsing a basic list should not mangle the list', () => {
            const testDescription = '  - indented list\n     - Foo';
            const parsedFile = _parsePlanningItems(testDescription);
            expect(parsedFile.strippedDescription).toEqual(testDescription);
          });

          test('Parsing a list with planning items should not mangle the list', () => {
            const testDescription = '  - indented list\n     - Foo';
            const parsedFile = _parsePlanningItems(
              `SCHEDULED: <2019-07-30 Tue>\n${testDescription}`
            );
            expect(parsedFile.strippedDescription).toEqual(testDescription);
          });
        });

        describe('Planning items are formatted as is default Emacs', () => {
          test('For basic files', () => {
            const testOrgFile = readFixture('schedule');
            const exportedFile = parseAndExportOrgFile(testOrgFile);
            expect(exportedFile).toEqual(testOrgFile);
          });

          test('For files with multiple planning items', () => {
            const testOrgFile = readFixture('schedule_and_deadline');
            const exportedFile = parseAndExportOrgFile(testOrgFile);
            expect(exportedFile).toEqual(testOrgFile);
          });
        });

        test('Properties are formatted as is default in Emacs', () => {
          const testOrgFile = readFixture('properties');
          const exportedFile = parseAndExportOrgFile(testOrgFile);
          expect(exportedFile).toEqual(testOrgFile);
        });

        test('Tags are formatted as is default in Emacs', () => {
          const testOrgFile = readFixture('tags');
          const exportedFile = parseAndExportOrgFile(testOrgFile);
          expect(exportedFile).toEqual(testOrgFile);
        });
      });
    });
    describe('Logbook entries', () => {
      test('Logbook entries are formatted as is default in Emacs', () => {
        const testOrgFile = readFixture('logbook');
        const exportedFile = parseAndExportOrgFile(testOrgFile);
        expect(exportedFile).toEqual(testOrgFile);
      });
    });
  });
  describe('Reducers and helper functions', () => {
    describe('"nologrepeat" configuration', () => {
      test('Detects "nologrepeat" when set in #+STARTUP as only option', () => {
        const testOrgFile = readFixture('schedule_with_repeater_and_nologrepeat');
        const state = parseOrg(testOrgFile);
        expect(noLogRepeatEnabledP({ state, headerIndex: 0 })).toBe(true);
      });
      test('Detects "nologrepeat" when set in #+STARTUP with other options', () => {
        const testOrgFile = readFixture('schedule_with_repeater_and_nologrepeat_and_other_options');
        const state = parseOrg(testOrgFile);
        expect(noLogRepeatEnabledP({ state, headerIndex: 0 })).toBe(true);
      });
      test('Does not detect "nologrepeat" when not set', () => {
        const testOrgFile = readFixture('schedule_with_repeater');
        const state = parseOrg(testOrgFile);
        expect(noLogRepeatEnabledP({ state, headerIndex: 0 })).toBe(false);
      });
      test('Detects "nologrepeat" when set via a property list', () => {
        const testOrgFile = readFixture('schedule_with_repeater_and_nologrepeat_property');
        const state = parseOrg(testOrgFile);
        expect(noLogRepeatEnabledP({ state, headerIndex: 1 })).toBe(true);
        expect(noLogRepeatEnabledP({ state, headerIndex: 2 })).toBe(true);
        expect(noLogRepeatEnabledP({ state, headerIndex: 5 })).toBe(false);
        expect(noLogRepeatEnabledP({ state, headerIndex: 7 })).toBe(true);
      });
    });
  });
});
