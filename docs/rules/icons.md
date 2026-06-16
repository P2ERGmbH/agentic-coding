# Icon Usage

**Always** use icons as described below and **never** use any other icon implementations. If you need gradients, there are props on the component to use them. Always use them.

## 1. Static Icons (SVG)

### Usage

```tsx
import { Icon } from '@/components/ui/Icon';
import { UserIcon } from '@/icons';

<Icon as={UserIcon} className="size-6 text-blue-500" />
```

### Typing Icon Props (IconT)

If you need to pass an Icon as a prop, use `IconT` as the type.

```tsx
import { type IconT } from '@/components/ui/Icon';

type MyComponentProps = {
  icon: IconT;
  // other props
}

function MyComponent({ icon: CustomIcon, ...props }: MyComponentProps) {
  return <Icon as={CustomIcon} />;
}
```

## 2. Animated Icons (Lottie)

### Usage

```tsx
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { CheckSquare } from '@/icons/animated';

<AnimatedIcon animationData={CheckSquare} loop={true} className="size-10" />
```

## 3. Page Sections & Main Module Icons (SECTION_CONFIG)

For any page sections, navigation tiles, or main modules/entities (e.g., `user`, `product`, `settings`, `home`, etc.), icons **MUST** be used as defined in `SECTION_CONFIG` in `@/constants/sections`. This acts as the single source of truth for the application.

### Usage

```tsx
import { SECTION_CONFIG } from '@/constants/sections';

const userIcon = SECTION_CONFIG.user.icon;
const productIcon = SECTION_CONFIG.product.icon;
```
Never import or use arbitrary/different icons for standard page sections or navigational modules.

