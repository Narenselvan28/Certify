// 27 curated Google Fonts in 4 categories

export const FONTS = [
  // Sans Serif
  { name: 'Inter',             category: 'Sans Serif',  family: 'Inter' },
  { name: 'Poppins',           category: 'Sans Serif',  family: 'Poppins' },
  { name: 'Montserrat',        category: 'Sans Serif',  family: 'Montserrat' },
  { name: 'Roboto',            category: 'Sans Serif',  family: 'Roboto' },
  { name: 'Open Sans',         category: 'Sans Serif',  family: 'Open Sans' },
  { name: 'Lato',              category: 'Sans Serif',  family: 'Lato' },
  { name: 'Nunito',            category: 'Sans Serif',  family: 'Nunito' },
  { name: 'Raleway',           category: 'Sans Serif',  family: 'Raleway' },
  { name: 'Oswald',            category: 'Sans Serif',  family: 'Oswald' },
  { name: 'Ubuntu',            category: 'Sans Serif',  family: 'Ubuntu' },
  // Serif
  { name: 'Playfair Display',  category: 'Serif',       family: 'Playfair Display' },
  { name: 'Merriweather',      category: 'Serif',       family: 'Merriweather' },
  { name: 'Lora',              category: 'Serif',       family: 'Lora' },
  { name: 'Libre Baskerville', category: 'Serif',       family: 'Libre Baskerville' },
  { name: 'Cormorant Garamond',category: 'Serif',       family: 'Cormorant Garamond' },
  { name: 'EB Garamond',       category: 'Serif',       family: 'EB Garamond' },
  // Display
  { name: 'Bebas Neue',        category: 'Display',     family: 'Bebas Neue' },
  { name: 'Anton',             category: 'Display',     family: 'Anton' },
  { name: 'Abril Fatface',     category: 'Display',     family: 'Abril Fatface' },
  { name: 'Archivo Black',     category: 'Display',     family: 'Archivo Black' },
  { name: 'Barlow Condensed',  category: 'Display',     family: 'Barlow Condensed' },
  // Handwriting / Script
  { name: 'Pacifico',          category: 'Handwriting', family: 'Pacifico' },
  { name: 'Caveat',            category: 'Handwriting', family: 'Caveat' },
  { name: 'Dancing Script',    category: 'Handwriting', family: 'Dancing Script' },
  { name: 'Great Vibes',       category: 'Handwriting', family: 'Great Vibes' },
  { name: 'Sacramento',        category: 'Handwriting', family: 'Sacramento' },
  { name: 'Satisfy',           category: 'Handwriting', family: 'Satisfy' },
];

export const FONT_CATEGORIES = ['Sans Serif', 'Serif', 'Display', 'Handwriting'];

/** Pre-load a font before canvas rendering */
export async function ensureFontLoaded(family, weight = 'normal', style = 'normal') {
  try {
    if (document.fonts?.load) {
      await document.fonts.load(`${style} ${weight} 16px "${family}"`);
    }
  } catch {
    // graceful degradation
  }
}
