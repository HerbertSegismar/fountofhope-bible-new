export interface Verse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  testament: "OT" | "NT";
}

export interface Book {
  id: number;
  name: string;
  testament: "OT" | "NT";
  chapters: number;
}

export type RootStackParamList = {
  Home: undefined;
  BookList: undefined;
  ChapterList: { book: Book };
  VerseList: { book: Book; chapter: number };
  Search: undefined;
};
