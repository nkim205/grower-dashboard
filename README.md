Make sure to install dependencies with `npm install`

# Adding a new state
1. In `public/states/`, create a subfolder for the new state using its 2 letter abbreviation (e.g. `public/states/CA` for California)
2. Add the state's CSV file to its state folder, ensuring the following:
   * File name should follow `[STATE]_DATA.csv`
   * Follow the standard data format:
     * Headers: County, SAIDI, FIPS, State
     * Columns:
       * `County`: The name of the county exlcuding the word "county" (e.g. 'Los Angeles')
       * `SAIDI`: The outage metric as a number
       * `FIPS`: The 5 digit FIPS code for the county (must be padded with leading zeroes to get 5 digits)
       * `State`: The full state name (e.g. 'California')
     * Example row: `Los Angeles, 123.45, 06037, California`
     * Ensure that the FIPS codes are accurate, you can cross-reference with the `public/counties.geojson` file by searching for a county name
     * If a county has no data, put 0 for the SAIDI value, while keeping the rest of the information correct
3. Add the csv file path to the `STATE_CSV_URLS` list in `src/pages/Map3D.jsx`