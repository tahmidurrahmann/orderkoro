import { LandingHeaderNav } from "./LandingHeaderNav";
import { LandingLanguageSwitch } from "./LandingLanguageSwitch";
import { LandingWordmark } from "./LandingWordmark";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 w-full -mb-[60px] sm:-mb-[62px]">
      <div className="mx-auto w-full max-w-[1208px] px-2.5 sm:px-3 xl:px-8 py-1.5">
        <LandingHeaderNav>
          <LandingWordmark />
          <LandingLanguageSwitch />
        </LandingHeaderNav>
      </div>
    </header>
  );
}
