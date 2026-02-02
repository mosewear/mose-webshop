import { Metadata } from 'next';
import MediaLibraryClient from './MediaLibraryClient';

export const metadata: Metadata = {
  title: 'Media Library | MOSE Admin',
  description: 'Beheer alle media bestanden',
};

export default function MediaPage() {
  return <MediaLibraryClient />;
}




