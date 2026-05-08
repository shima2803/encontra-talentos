import { getVagas } from '@/services/api';
import { HeroSection } from '@/components/home/HeroSection';
import { SearchBar } from '@/components/home/SearchBar';
import { FeaturedJobs } from '@/components/home/FeaturedJobs';
import { AccessAccount } from '@/components/home/AccessAccount';
import { PopularCategories } from '@/components/home/PopularCategories';
import { HiringCompanies } from '@/components/home/HiringCompanies';

export default async function HomePage() {
  const vagas = await getVagas(); // somente vagas internas (das nossas empresas)
  const vagasDestaque = vagas.slice(0, 4);

  return (
    <>
      <HeroSection />
      <SearchBar />

      <div className="mx-auto mt-12 max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedJobs vagas={vagasDestaque} />
          </div>

          <aside className="space-y-5">
            <AccessAccount />
            <PopularCategories vagas={vagas} />
          </aside>
        </div>

        <HiringCompanies />
      </div>
    </>
  );
}
