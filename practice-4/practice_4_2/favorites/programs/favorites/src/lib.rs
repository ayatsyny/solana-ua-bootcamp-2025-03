use anchor_lang::prelude::*;

declare_id!("DGmTqQN6vFzujY1fkGcfjR8Y8UCkGNNZi5jgrYXh8edP");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,

    #[max_len(50)]
    pub color: String,

    pub owner: Pubkey,

    pub delegate: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct SetFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Favorites::INIT_SPACE,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFavorites<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, seeds = [b"favorites", user.key().as_ref()], bump)]
    pub favorites: Account<'info, Favorites>,

    /// CHECK: Only used for deriving the PDA address, not accessed
    pub user: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"favorites", owner.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the owner or delegate can update this account.")]
    Unauthorized,
}


#[program]
pub mod favorites {
    use super::*;

    pub fn set_favorites(ctx: Context<SetFavorites>, number: u64, color: String) -> Result<()> {
        let favorites = &mut ctx.accounts.favorites;

        favorites.number = number;
        favorites.color = color;
        favorites.owner = ctx.accounts.user.key();
        favorites.delegate = Option::None;

        Ok(())
    }

    pub fn update_favorites(
        ctx: Context<UpdateFavorites>,
        number: Option<u64>,
        color: Option<String>,
    ) -> Result<()> {
        let favorites = &mut ctx.accounts.favorites;
        let signer = ctx.accounts.signer.key();
    
        // Allow updates only by the owner or the delegate
        let is_owner = signer == ctx.accounts.user.key();
        let is_delegate = favorites
            .delegate
            .map_or(false, |d| d == signer);
    
        require!(is_owner || is_delegate, ErrorCode::Unauthorized);
    
        if let Some(n) = number {
            favorites.number = n;
        }
    
        if let Some(c) = color {
            favorites.color = c;
        }
    
        Ok(())
    }
    

    pub fn set_authority(ctx: Context<SetAuthority>, new_delegate: Option<Pubkey>) -> Result<()> {
        let favorites = &mut ctx.accounts.favorites;
        favorites.delegate = match new_delegate {
            Some(pk) => Option::Some(pk),
            None => Option::None,
        };

        Ok(())
    }
}
